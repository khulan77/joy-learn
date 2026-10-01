import { Prisma, PrismaClient } from "@prisma/client";
import type { Session } from "../shared";
import type { StructuredExercise, MasteryChange } from "../shared/practice";
import { masteryConfig, updateMastery } from "../learning-engine";
import { PersistenceConflictError } from "./repository";
export class PostgresPracticeStore {
  constructor(private db: PrismaClient) {}
  async curriculum(): Promise<StructuredExercise[]> {
    const rows = await this.db.curriculumExercise.findMany({
      orderBy: { id: "asc" },
    });
    return rows.map((r) => r.content as unknown as StructuredExercise);
  }
  async masteryHistory(studentId: string): Promise<MasteryChange[]> {
    const rows = await this.db.masteryEvent.findMany({
      where: { studentId },
      orderBy: { id: "asc" },
      include: { attempt: { select: { sessionId: true } } },
    });
    return rows.map((e) => ({
      attemptId: e.attemptId,
      sessionId: e.attempt.sessionId,
      skillId: e.skillId,
      before: e.before,
      after: e.after,
      delta: e.delta,
      createdAt: e.createdAt.toISOString(),
    }));
  }
  async save(s: Session, expectedVersion?: number) {
    const practice = s.practice!;
    await this.db.$transaction(async (tx) => {
      await tx.student.createMany({
        data: [{ id: s.studentId }],
        skipDuplicates: true,
      });
      // Serialize mastery changes across all simultaneous sessions for this student.
      await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${s.studentId} FOR UPDATE`;
      let attemptCount = 0,
        messageCount = 0;
      const data = {
        status: s.status,
        step: s.step,
        hintLevel: s.hintLevel,
        hintsUsed: s.hintsUsed,
        version: s.version,
        updatedAt: new Date(s.updatedAt),
      };
      if (expectedVersion === undefined) {
        await tx.problem.createMany({
          data: [{ text: s.problem, topicId: practice.skill.topicId }],
          skipDuplicates: true,
        });
        const problem = await tx.problem.findUniqueOrThrow({
          where: {
            text_topicId: { text: s.problem, topicId: practice.skill.topicId },
          },
        });
        await tx.learningSession.create({
          data: {
            ...data,
            id: s.id,
            studentId: s.studentId,
            problemId: problem.id,
            exerciseId: practice.exercise.id,
            practice: JSON.parse(
              JSON.stringify(practice),
            ) as Prisma.InputJsonValue,
            createdAt: new Date(s.createdAt),
          },
        });
      } else {
        const current = await tx.learningSession.findUnique({
          where: { id: s.id },
          select: {
            studentId: true,
            exerciseId: true,
            _count: { select: { attempts: true, messages: true } },
          },
        });
        if (
          !current ||
          current.studentId !== s.studentId ||
          current.exerciseId !== practice.exercise.id
        )
          throw new PersistenceConflictError();
        attemptCount = current._count.attempts;
        messageCount = current._count.messages;
        const updated = await tx.learningSession.updateMany({
          where: { id: s.id, version: expectedVersion },
          data,
        });
        if (updated.count !== 1) throw new PersistenceConflictError();
      }
      for (const [index, a] of s.attempts.slice(attemptCount).entries()) {
        await tx.attempt.create({
          data: { ...a, position: attemptCount + index, sessionId: s.id },
        });
        const key = { studentId: s.studentId, skillId: practice.skill.id };
        const mastery = await tx.mastery.findUnique({
          where: { studentId_skillId: key },
        });
        const before = mastery?.score ?? masteryConfig.initial,
          after = updateMastery(before, a);
        await tx.mastery.upsert({
          where: { studentId_skillId: key },
          create: { ...key, score: after },
          update: { score: after },
        });
        await tx.masteryEvent.create({
          data: {
            attemptId: a.id,
            ...key,
            before,
            after,
            delta: after - before,
            createdAt: new Date(a.createdAt),
          },
        });
      }
      await tx.tutorMessage.createMany({
        data: s.messages
          .slice(messageCount)
          .map((m, index) => ({
            ...m,
            sessionId: s.id,
            position: messageCount + index,
          })),
      });
    });
  }
}
