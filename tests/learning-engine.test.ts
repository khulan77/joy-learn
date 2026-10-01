import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sampleExercises, skills } from "../packages/curriculum/sample";
import {
  startPractice,
  respondPractice,
  practiceView,
  getHint,
  detectMistake,
  updateMastery,
  chooseDifficulty,
  selectExercise,
  progressView,
} from "../packages/learning-engine";
import { FileRepository } from "../packages/database";
const fresh = () => startPractice(crypto.randomUUID(), "division", 50, []);

test("sample curriculum covers 4 skills with 2 exercises at each difficulty, valid solutions and mistakes", () => {
  expect(sampleExercises).toHaveLength(24);
  expect(new Set(sampleExercises.map((e) => e.id)).size).toBe(24);
  for (const skill of skills)
    for (const difficulty of [1, 2, 3])
      expect(
        sampleExercises.filter(
          (e) => e.skillId === skill.id && e.difficulty === difficulty,
        ),
      ).toHaveLength(2);
  for (const e of sampleExercises) {
    expect(e.source).toBe("sample");
    expect(e.solutionSteps.length).toBeGreaterThan(1);
    expect(e.hints).toHaveLength(3);
    expect(e.commonMistakes.every((m) => m.answer !== e.correctAnswer)).toBe(
      true,
    );
  }
});
test("three wrong answers provide progressive hints without revealing the final equation", () => {
  let s = fresh();
  for (const level of [1, 2, 3]) {
    s = respondPractice(s, { answer: "999" });
    expect(s.hintLevel).toBe(level);
    expect(s.status).toBe("active");
    expect(s.messages.at(-1)?.content).not.toContain("= 4");
  }
  expect(s.messages.at(-1)?.content).toContain("тойрог");
  const stronger = getHint(s.practice!.exercise, 2, {
    secondAt: 3,
    heavyAt: 4,
  });
  expect(stronger.level).toBe(1);
});
test("known division and multiplication mistakes get targeted help", () => {
  let s = fresh();
  s = respondPractice(s, { answer: "18" });
  expect(s.attempts[0].detectedMistake).toBe("subtract-instead-of-divide");
  expect(s.messages.at(-1)?.content).toContain("нэг удаа хасахгүй");
  const e = sampleExercises.find((e) => e.question === "6 × 4 = ?")!;
  expect(detectMistake(e, 10)?.id).toBe("add-instead-of-multiply");
  expect(detectMistake(e, 11)).toBeUndefined();
});
test("mastery rewards independence, penalizes mistakes, and clamps both bounds", () => {
  expect(updateMastery(50, { correct: true, hintLevel: 0 })).toBe(60);
  expect(updateMastery(50, { correct: true, hintLevel: 1 })).toBe(56);
  expect(updateMastery(50, { correct: true, hintLevel: 2 })).toBe(53);
  expect(updateMastery(50, { correct: true, hintLevel: 3 })).toBe(51);
  expect(updateMastery(50, { correct: false, hintLevel: 0 })).toBe(45);
  expect(updateMastery(99, { correct: true, hintLevel: 0 })).toBe(100);
  expect(updateMastery(1, { correct: false, hintLevel: 0 })).toBe(0);
});
test("adaptive rules choose easy/hard, lower after failures, increase after clean successes", () => {
  expect(chooseDifficulty(20, [])).toBe(1);
  expect(chooseDifficulty(80, [])).toBe(3);
  let s = fresh();
  s = respondPractice(s, { answer: "99" });
  s = respondPractice(s, { answer: "99" });
  expect(chooseDifficulty(80, [s])).toBe(1);
  const one = respondPractice(fresh(), { answer: "4" }),
    two = respondPractice(fresh(), { answer: "4" });
  expect(chooseDifficulty(65, [one, two])).toBe(3);
});
test("selector avoids immediate repeats and marks intentional review after pool exhaustion", () => {
  const s = fresh(),
    second = startPractice(s.studentId, "division", 50, [s]);
  expect(second.practice!.exercise.id).not.toBe(s.practice!.exercise.id);
  const selection = selectExercise("division", 50, [s, second]);
  expect(selection.reason).toBe("review");
  expect(selection.exercise.id).toBe(s.practice!.exercise.id);
});
test("hint requests lower later rewards; completed sessions and invalid answers cannot earn extra credit", () => {
  const s = respondPractice(fresh(), { hint: true });
  expect(s.attempts).toHaveLength(0);
  const done = respondPractice(s, { answer: "4" });
  expect(done.attempts[0].hintLevel).toBe(1);
  expect(done.messages.at(-1)?.content).toContain("6 × 4 = 24");
  expect(() => respondPractice(done, { answer: "4" })).toThrow();
  expect(() => respondPractice(fresh(), { answer: "4xyz" })).toThrow();
});
test("public practice view never exposes hidden curriculum answers, solutions or mistake patterns", () => {
  const view = practiceView(fresh(), "file");
  const json = JSON.stringify(view);
  for (const key of [
    "correctAnswer",
    "solutionSteps",
    "commonMistakes",
    "remediationHint",
  ])
    expect(json).not.toContain(key);
});
test("file fallback atomically retains practice, mastery history, and rejects duplicate turns", async () => {
  const directory = await mkdtemp(join(tmpdir(), "joy-practice-"));
  try {
    let repo = new FileRepository(directory),
      s = fresh();
    await repo.save(s);
    const next = respondPractice(s, { answer: "18" });
    const attempts = await Promise.allSettled([
      repo.save(next, 0),
      repo.save(next, 0),
    ]);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    repo = new FileRepository(directory);
    expect(await repo.get(s.id)).toEqual(next);
    const history = await repo.masteryHistory(s.studentId);
    expect(history).toHaveLength(1);
    expect(history[0].after).toBe(45);
    const progress = progressView(
      await repo.practiceSessions(s.studentId),
      history,
      "file",
    );
    expect(
      progress.skills.find((p) => p.skill.id === "division")?.attempts,
    ).toBe(1);
    expect(await repo.masteryHistory(crypto.randomUUID())).toHaveLength(0);
    s = respondPractice(next, { answer: "4" });
    await repo.save(s, next.version);
    expect((await repo.masteryHistory(s.studentId)).at(-1)?.after).toBe(51);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("recommendations prefer weak skills then unpracticed skills over already successful ones", () => {
  const s = fresh();
  const event = {
    attemptId: "example",
    sessionId: s.id,
    skillId: "division",
    before: 50,
    after: 40,
    delta: -10,
    createdAt: s.createdAt,
  };
  expect(progressView([s], [event], "file").recommendedSkillId).toBe(
    "division",
  );
  expect(
    progressView([s], [{ ...event, after: 90 }], "file").recommendedSkillId,
  ).toBe("addition");
});
