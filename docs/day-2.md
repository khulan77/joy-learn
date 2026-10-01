# Day 2 — structured practice and learning engine

## Scope and architecture

Day 1 homework tutoring, cookie identity, Prisma adapters and tests were retained. New routes are `/practice` and `/progress`. UI consumes only API responses; correct answers, solution steps and unrevealed hints never enter practice responses. The legacy homework session endpoint rejects practice IDs so it cannot expose the internal snapshot.

`packages/curriculum/sample.ts` contains the small authored development dataset. PostgreSQL stores it via `bun run db:seed`; file mode uses the same module directly. The skill catalog remains code-maintained in this MVP. `packages/learning-engine` exports pure functions for hint progression, known mistakes, mastery changes, adaptive selection, public views, recommendations and future structured AI context. NestJS coordinates these functions and the repository without making AI calls.

## Curriculum

All 24 exercises are marked `source: sample`, grade 3, mathematics. There are two exercises at each of three difficulties for each of four skills:

- Addition/subtraction topic: two-digit addition (including carrying), two-digit subtraction (including borrowing).
- Multiplication topic: repeated addition/multiplication facts; harder samples use short box/pencil word problems.
- Division topic: equal sharing and the inverse multiplication relationship; harder samples use short candy-sharing word problems.

Each content object has grade, subject, topic, skill, concept through the skill, difficulty, answer, solution steps, three hints, known wrong numeric answers, remediation and reinforcement. This is not a complete or official Mongolian curriculum. Three-digit addition and other skills are intentionally absent from the small first dataset.

Seed is repeatable and refreshes sample content. Every practice session captures its exercise and skill metadata so refreshing seed content does not change an in-flight exercise. IDs/version support a future reviewed publishing process; immutable published versions and editorial tooling are not implemented.

## Learning rules

Configuration lives in `packages/learning-engine/config.ts`.

- Each incorrect answer or hint request increases help count. First help uses hint 1; second uses hint 2; third and subsequent use concrete step-by-step counting/grouping guidance. No final answer is automatically revealed, even at the strongest level.
- Known mistakes match explicit numeric answers, such as `18` for `24 ÷ 6` and `10` for `6 × 4`. Targeted remediation accompanies the current hint. This is a possible interpretation, not a diagnosis.
- Practice assesses the whole exercise. It does not score every small guided homework step. A correct answer completes the exercise once and reinforces the arithmetic relationship.
- Mastery starts at 50 per student/skill. Correct answers add 10/6/3/1 for no hints / hint 1 / hint 2 / heavy help. Incorrect answers subtract 5. Scores clamp to 0–100. Hint requests alone do not change score, but affect later credit. Invalid input is rejected and earns no event. Completed sessions reject further answers.
- Base difficulty: score <40 easy, 40–70 medium, >70 hard. Two recent wrong answers lower the previous difficulty one level. Two consecutive completed exercises with one correct attempt and no help raise it one level. Difficulty moves at most one level from the previous exercise. These are configurable assumptions.
- Selection prefers an unseen exercise at that level. Once the two-example level pool is exhausted, the least recently seen exercise is intentionally reviewed and labeled as review. Concurrent new-session requests may select the same exercise; turn submission is version-protected.
- Recommendation chooses the lowest score, preferring an unpracticed skill on ties. Unpracticed cards show “not practiced” rather than implying measured mastery from the initial 50.

The future `learningContext()` helper supplies grade, score, subject/topic/skill/concept/difficulty, attempts, hint level and detected mistake. Curriculum and scoring stay deterministic. No AI adapter is enabled.

## Persistence and migration

The additive `202610010001_learning_engine` migration creates `Skill`, `CurriculumExercise`, and `MasteryEvent`. It adds an optional exercise relation and practice JSON snapshot to `LearningSession`, a detected-mistake field to `Attempt`, and a unique student/skill relation to `Mastery`. Legacy topic-based Mastery rows remain possible and are not reinterpreted or deleted; new practice scores use skillId.

PostgreSQL locks the student's row while writing a practice turn. The session version update, new attempts/messages, mastery value and history event commit together. Attempt uniqueness prevents duplicate history. A failed message insert rolls back both score and session. Concurrent turns in separate sessions for the same student do not lose score updates.

File fallback stores all practice sessions and mastery history in `.data/sessions/practice-state.json` with a single-process queue and atomic rename. Older homework JSON files are unchanged. File and PostgreSQL stores remain separate. Progress history is ordered by committed event ID in PostgreSQL and array order in file mode.

## Run

```sh
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev:api
# In another terminal:
bun run dev
```

Use the existing PostgreSQL Docker/native startup instructions in README. `bun run dev` defaults to 5126. Existing file sessions are not imported into PostgreSQL.

## Verification

- Unit tests: Day 1 tutor and file recovery, storage config, 24-exercise coverage, hint progression/configuration, targeted mistakes, independent vs assisted mastery/clamping, adaptive thresholds/streaks, exercise rotation/review, completion/input guards, answer redaction, atomic file practice/history, skill recommendations.
- PostgreSQL integration: all original persistence tests, concurrent practice turns, history exactly once, transactional mastery rollback, independent simultaneous session updates, practice API privacy, hints/mastery and resume after an API process restart.
- Browser: original homework flow plus mobile topic/skill selection → known mistake → stronger hints → refresh → success → easier next exercise → progress and reload. Clean repeated successes lead to harder exercises.
- Mobile visual review uses 390×844 Chromium emulation, not a physical phone. Screenshots are `.data/day2-practice-mobile.png` and `.data/day2-progress-mobile.png`. A live in-app browser control tool was not available, so verification used Playwright and direct screenshot inspection.

## Limitations and Day 3 recommendation

This is local development software with anonymous cookie identity, not production authentication. The curriculum and numeric mastery rules are unreviewed samples. Repetition can inflate the score; it does not prove transfer to unseen work. There is no semantic understanding of free-form answers. Practice accepts nonnegative integers only. Progress currently loads full session/history data without pagination; file mode stores one aggregate and is single-process only. Parent/teacher views, LLMs, voice, payments, OCR and additional grades/subjects remain out of scope.

For Day 3, prioritize a Mongolian primary-teacher review and a small observed learning test. Validate hints, wording and difficulty, and measure an unaided similar problem after guided practice before expanding content or adding an LLM. Day 3 is not started automatically.

Final checks (2026-10-01): lint and TypeScript passed; 15 unit/configuration tests passed (194 assertions); 7 real PostgreSQL integration tests passed (51 assertions); 5 browser tests passed, including the original Day 1 flow. API compilation and the Next.js production build passed. Mobile screenshot review prompted immediate scrolling to the latest hint, now checked by a viewport assertion. No physical-device test was performed.
