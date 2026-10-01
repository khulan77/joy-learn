import { skills, sampleExercises } from "../curriculum/sample";
import type { Session, Attempt, Message } from "../shared";
import type {
  StructuredExercise,
  Difficulty,
  MasteryChange,
  ProgressView,
  PracticeView,
  SkillProgress,
} from "../shared/practice";
import { TutorError } from "../ai-tutor";
import { masteryConfig, hintConfig, adaptiveConfig } from "./config";
export { masteryConfig, hintConfig, adaptiveConfig } from "./config";
export function updateMastery(
  score: number,
  attempt: Pick<Attempt, "correct" | "hintLevel">,
  config = masteryConfig,
) {
  const delta = !attempt.correct
    ? config.incorrect
    : attempt.hintLevel === 0
      ? config.correctWithoutHint
      : attempt.hintLevel === 1
        ? config.correctAfterHint1
        : attempt.hintLevel === 2
          ? config.correctAfterHint2
          : config.correctAfterHeavyHelp;
  return Math.max(config.min, Math.min(config.max, score + delta));
}
export function getHint(
  exercise: StructuredExercise,
  helpCount: number,
  config = hintConfig,
) {
  const level =
    helpCount >= config.heavyAt ? 3 : helpCount >= config.secondAt ? 2 : 1;
  return { level, text: exercise.hints[level - 1] };
}
export function detectMistake(exercise: StructuredExercise, answer: number) {
  return exercise.commonMistakes.find((m) => m.answer === answer);
}
export function chooseDifficulty(
  score: number,
  recent: Session[],
  config = adaptiveConfig,
): Difficulty {
  let target = score < config.easyBelow ? 1 : score > config.hardAbove ? 3 : 2;
  const last = recent.at(-1),
    previous = last?.practice?.exercise.difficulty;
  const answers = recent
    .flatMap((s) => s.attempts)
    .slice(-config.failureStreak);
  if (
    answers.length === config.failureStreak &&
    answers.every((a) => !a.correct)
  )
    target = Math.max(1, (previous ?? target) - 1);
  else {
    const completed = recent.slice(-config.successStreak);
    if (
      completed.length === config.successStreak &&
      completed.every(
        (s) =>
          s.status === "completed" &&
          s.attempts.length === 1 &&
          s.hintsUsed === 0,
      )
    )
      target = Math.min(3, (previous ?? target) + 1);
  }
  if (previous) target = Math.max(previous - 1, Math.min(previous + 1, target));
  return target as Difficulty;
}
export function selectExercise(
  skillId: string,
  score: number,
  recent: Session[],
  exercises = sampleExercises,
) {
  const difficulty = chooseDifficulty(score, recent);
  const candidates = exercises.filter(
    (e) => e.skillId === skillId && e.difficulty === difficulty,
  );
  if (!candidates.length)
    throw new TutorError("Энэ чадварын дасгал олдсонгүй.", 404);
  const seen = recent.map((s) => s.practice?.exercise.id);
  const selected =
    candidates.find((e) => !seen.includes(e.id)) ??
    [...candidates].sort(
      (a, b) => seen.lastIndexOf(a.id) - seen.lastIndexOf(b.id),
    )[0];
  return {
    exercise: selected,
    reason: seen.includes(selected.id) ? "review" : "adaptive",
  };
}
function message(content: string, role: Message["role"] = "tutor"): Message {
  return {
    id: crypto.randomUUID(),
    content,
    role,
    createdAt: new Date().toISOString(),
  };
}
export function startPractice(
  studentId: string,
  skillId: string,
  score: number,
  recent: Session[],
  exercises = sampleExercises,
): Session {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) throw new TutorError("Чадвар олдсонгүй.", 404);
  const { exercise, reason } = selectExercise(
    skillId,
    score,
    recent,
    exercises,
  );
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    studentId,
    problem: exercise.question,
    topic: skill.topic,
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
      message("Эхлээд өөрөө бодоод үзээрэй. Хэрэгтэй бол сэжүүр авч болно."),
    ],
    practice: {
      exercise: structuredClone(exercise),
      skill,
      selectionReason: reason,
    },
  };
}
export function respondPractice(
  current: Session,
  input: { answer?: string; hint?: boolean },
): Session {
  if (!current.practice) throw new TutorError("Дасгал олдсонгүй.", 404);
  if (current.status === "completed")
    throw new TutorError("Дасгал дууссан байна.", 409);
  const s = structuredClone(current),
    exercise = s.practice!.exercise;
  let text: string;
  if (input.hint) {
    const hint = getHint(exercise, s.hintsUsed + 1);
    s.hintLevel = hint.level;
    s.hintsUsed++;
    s.messages.push(message("Сэжүүр авъя.", "student"));
    text = hint.text;
  } else {
    const answer = input.answer?.trim();
    if (!answer || !/^\d{1,4}$/.test(answer))
      throw new TutorError("Хариултаа 0–9999 хүртэлх бүхэл тоогоор бичээрэй.");
    const correct = Number(answer) === exercise.correctAnswer,
      mistake = correct ? undefined : detectMistake(exercise, Number(answer));
    s.attempts.push({
      id: crypto.randomUUID(),
      answer,
      correct,
      step: 0,
      hintLevel: s.hintLevel,
      createdAt: new Date().toISOString(),
      ...(mistake ? { detectedMistake: mistake.id } : {}),
    });
    s.messages.push(message(answer, "student"));
    if (correct) {
      s.status = "completed";
      s.step = 1;
      text = `Зөв байна! ${exercise.reinforcement}`;
    } else {
      const hint = getHint(exercise, s.hintsUsed + 1);
      s.hintLevel = hint.level;
      s.hintsUsed++;
      text = `Дахиад бодоод үзье. ${mistake ? mistake.remediationHint + " " : ""}${hint.text}`;
    }
  }
  s.messages.push(message(text));
  s.version++;
  s.updatedAt = new Date().toISOString();
  return s;
}
export function practiceView(
  s: Session,
  storage: "file" | "postgres",
): PracticeView {
  if (!s.practice) throw new TutorError("Дасгал олдсонгүй.", 404);
  const e = s.practice.exercise;
  return {
    id: s.id,
    skill: s.practice.skill,
    exercise: {
      id: e.id,
      question: e.question,
      difficulty: e.difficulty,
      source: e.source,
    },
    status: s.status,
    version: s.version,
    hintLevel: s.hintLevel,
    hintsUsed: s.hintsUsed,
    messages: s.messages,
    attempts: s.attempts,
    storage,
    selectionReason: s.practice.selectionReason,
  };
}
export function progressView(
  sessions: Session[],
  history: MasteryChange[],
  storage: "file" | "postgres",
): ProgressView {
  const progress: SkillProgress[] = skills.map((skill) => {
    const own = sessions.filter((s) => s.practice?.skill.id === skill.id),
      events = history.filter((e) => e.skillId === skill.id);
    const attempts = own.flatMap((s) => s.attempts);
    return {
      skill,
      score: events.at(-1)?.after ?? masteryConfig.initial,
      attempts: attempts.length,
      correct: attempts.filter((a) => a.correct).length,
      hintsUsed: own.reduce((n, s) => n + s.hintsUsed, 0),
      practiced: attempts.length > 0,
      history: events,
    };
  });
  const recommended = [...progress].sort(
    (a, b) => a.score - b.score || Number(a.practiced) - Number(b.practiced),
  )[0];
  return {
    skills: progress,
    recommendedSkillId: recommended.skill.id,
    storage,
  };
}

/** Structured input for a future language adapter; all learning decisions remain deterministic. */
export function learningContext(session: Session, mastery: number) {
  if (!session.practice) throw new TutorError("Дасгал олдсонгүй.", 404);
  const { exercise, skill } = session.practice;
  return {
    student: { grade: session.grade, mastery },
    exercise: {
      id: exercise.id,
      version: exercise.version,
      subject: exercise.subject,
      topic: skill.topicId,
      skill: skill.id,
      concept: skill.concept,
      difficulty: exercise.difficulty,
    },
    learningState: {
      attempts: session.attempts.length,
      hintLevel: session.hintLevel,
      detectedMistake: session.attempts.at(-1)?.detectedMistake ?? null,
    },
  };
}
