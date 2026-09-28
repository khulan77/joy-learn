import { PrismaClient } from "@prisma/client";
import type { Session } from "../shared";
import { PersistenceConflictError, type SessionRepository } from "./repository";
export class PostgresRepository implements SessionRepository {
  mode = "postgres" as const;
  constructor(private db = new PrismaClient()) {}
  async connect() {
    await this.db.$connect();
    await this.db.learningSession.findFirst({ select: { id: true } });
  }
  async disconnect() {
    await this.db.$disconnect();
  }
  async get(id: string): Promise<Session | null> {
    const row = await this.db.learningSession.findUnique({
      where: { id },
      include: {
        problem: { include: { topic: true } },
        attempts: { orderBy: { position: "asc" } },
        messages: { orderBy: { position: "asc" } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      studentId: row.studentId,
      grade: 3,
      problem: row.problem.text,
      topic: row.problem.topic.name,
      status: row.status as Session["status"],
      step: row.step,
      hintLevel: row.hintLevel,
      hintsUsed: row.hintsUsed,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      attempts: row.attempts.map((a) => ({
        id: a.id,
        answer: a.answer,
        correct: a.correct,
        step: a.step,
        hintLevel: a.hintLevel,
        createdAt: a.createdAt.toISOString(),
      })),
      messages: row.messages.map((m) => ({
        id: m.id,
        role: m.role as "student" | "tutor",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
  async save(s: Session, expectedVersion?: number) {
    await this.db.$transaction(async (tx) => {
      let attemptCount = 0;
      let messageCount = 0;
      const data = {
        status: s.status,
        step: s.step,
        hintLevel: s.hintLevel,
        hintsUsed: s.hintsUsed,
        version: s.version,
        updatedAt: new Date(s.updatedAt),
      };
      if (expectedVersion === undefined) {
        // INSERT ... ON CONFLICT prevents races when sessions share reference rows.
        await tx.student.createMany({
          data: [{ id: s.studentId }],
          skipDuplicates: true,
        });
        await tx.subject.createMany({
          data: [{ id: "math", name: "Математик" }],
          skipDuplicates: true,
        });
        await tx.topic.createMany({
          data: [{ id: s.topic, name: s.topic, subjectId: "math" }],
          skipDuplicates: true,
        });
        await tx.problem.createMany({
          data: [{ text: s.problem, topicId: s.topic }],
          skipDuplicates: true,
        });
        const problem = await tx.problem.findUniqueOrThrow({
          where: { text_topicId: { text: s.problem, topicId: s.topic } },
        });
        await tx.learningSession.create({
          data: {
            ...data,
            id: s.id,
            studentId: s.studentId,
            problemId: problem.id,
            createdAt: new Date(s.createdAt),
          },
        });
      } else {
        const current = await tx.learningSession.findUnique({
          where: { id: s.id },
          select: { _count: { select: { attempts: true, messages: true } } },
        });
        if (!current) throw new PersistenceConflictError();
        attemptCount = current._count.attempts;
        messageCount = current._count.messages;
        const result = await tx.learningSession.updateMany({
          where: { id: s.id, version: expectedVersion },
          data,
        });
        if (result.count !== 1) throw new PersistenceConflictError();
      }
      await tx.attempt.createMany({
        data: s.attempts.slice(attemptCount).map((a, index) => ({
          ...a,
          sessionId: s.id,
          position: attemptCount + index,
        })),
      });
      await tx.tutorMessage.createMany({
        data: s.messages.slice(messageCount).map((m, index) => ({
          ...m,
          position: messageCount + index,
          sessionId: s.id,
        })),
      });
    });
  }
}
