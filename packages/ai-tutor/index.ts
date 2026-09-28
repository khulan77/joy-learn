import { createExercise } from "../curriculum";
import type { Session, Message } from "../shared";
export interface TutorContext {
  grade: 3;
  subject: "mathematics";
  session: Session;
}
export interface AIProvider {
  explain(context: TutorContext): Promise<string>;
}
export class TutorError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const message = (
  content: string,
  role: Message["role"] = "tutor",
): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
});
export class TutorService {
  start(problem: string, studentId: string): Session {
    const exercise = createExercise(problem);
    if (!exercise)
      throw new TutorError(
        "Одоогоор хоёр оронтой нэмэх, хасах, 2–10-ын хүрд болон үлдэгдэлгүй хуваах бодлого дэмжинэ. Жишээ: 24 ÷ 6.",
      );
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      studentId,
      problem: exercise.text,
      topic: exercise.topic,
      grade: 3,
      status: "active",
      step: 0,
      hintLevel: 0,
      hintsUsed: 0,
      version: 0,
      createdAt: now,
      updatedAt: now,
      attempts: [],
      messages: [
        message(`Хамтдаа алхам алхмаар бодъё! ${exercise.steps[0].question}`),
      ],
    };
  }
  respond(
    current: Session,
    input: { answer?: string; hint?: boolean },
  ): Session {
    if (current.status === "completed")
      throw new TutorError(
        "Энэ бодлого дууссан байна. Шинэ бодлого эхлүүлээрэй.",
        409,
      );
    const session = structuredClone(current);
    const exercise = createExercise(session.problem)!;
    const active = exercise.steps[session.step];
    let reply: string;
    if (input.hint) {
      session.messages.push(message("Надад сэжүүр өгөөч.", "student"));
      reply = active.hints[Math.min(session.hintLevel, 1)];
      session.hintLevel = Math.min(2, session.hintLevel + 1);
      session.hintsUsed++;
      reply += ` ${active.question}`;
    } else {
      const answer = input.answer?.trim();
      if (!answer || answer.length > 300)
        throw new TutorError("Хариултаа 1–300 тэмдэгтээр бичээрэй.");
      const correct = /^\d+$/.test(answer) && Number(answer) === active.answer;
      session.messages.push(message(answer, "student"));
      session.attempts.push({
        id: crypto.randomUUID(),
        answer,
        correct,
        step: session.step,
        hintLevel: session.hintLevel,
        createdAt: new Date().toISOString(),
      });
      if (correct) {
        session.step++;
        session.hintLevel = 0;
        if (session.step === exercise.steps.length) {
          session.status = "completed";
          reply = `Чи өөрөө бодож чадлаа! ${session.problem} = ${active.answer}. Бодлогоо жижиг алхмуудад хуваах нь тусалдаг шүү. Одоо төстэй бодлогыг өөрөө бодож үзээрэй.`;
        } else reply = `Зөв байна! ${exercise.steps[session.step].question}`;
      } else {
        reply = `Дахиад хамт бодоод үзье. ${active.hints[Math.min(session.hintLevel, 1)]} ${active.question}`;
        session.hintLevel = Math.min(2, session.hintLevel + 1);
        session.hintsUsed++;
      }
    }
    session.messages.push(message(reply));
    session.version++;
    session.updatedAt = new Date().toISOString();
    return session;
  }
}
