# Joy Learn V2

Mongolian Grade 3 mathematics, with guided questions rather than immediate answers. Homework retains the Day 1 guided loop. Day 2 adds Practice → progressive hints → skill mastery → adaptive next exercise, plus Progress. No LLM calls are made.

## Start locally with PostgreSQL

Requires Bun 1.3+, Node 20.19+, and Docker with Compose (or the native alternative below).

```sh
bun install
cp .env.example .env
```

Set a local password in `.env` in **both** `POSTGRES_PASSWORD` and `DATABASE_URL`. Keep the URL's user/database/port aligned with the `POSTGRES_*` values, and URL-encode password characters if needed. Never commit `.env`.

```sh
bun run db:up          # PostgreSQL 17; waits for healthy status
bun run db:generate    # Prisma client
bun run db:migrate     # Apply checked-in migrations, not db push
bun run db:status
bun run db:seed        # 4 skills / 24 development sample exercises
bun run dev:api
```

In another terminal:

```sh
bun run dev --port 5126
```

Open http://localhost:5126. The internal API binds to 127.0.0.1:3001. Restart `dev:api` after backend edits. It compiles NestJS decorators with TypeScript, then runs the output with Bun. The API checks database connectivity and the session table before listening, logs the selected storage mode, and disconnects on shutdown.

`bun run dev` defaults to port 5126 (the existing local preference is preserved). Do not run two Next.js dev servers for this checkout.

### No Docker installed?

An optional [native PostgreSQL runner](https://github.com/leinelissen/embedded-postgres) downloads PostgreSQL 17 into ignored `.data/postgres-runtime`, without changing system services or application dependencies:

```sh
bun run db:native:install
bun run db:native
```

Keep that terminal open. In another terminal, run `db:generate`, `db:migrate`, `db:seed`, then `dev:api` as above. Native and Docker modes use the same environment variables but **separate data directories**; they do not share data. Run only one on the configured port. Native storage persists in `.data/pg17`; Ctrl+C stops its server without deleting data. After restarting your computer, rerun `db:native` before the API.

For this checkout's verification, the ignored `.env` uses PostgreSQL on **55432** with a generated local password. The tracked example defaults to **5432**. The native database and API were left running after verification.

### Stopping PostgreSQL

`bun run db:down` stops Docker containers and preserves the named volume. `docker compose down -v` would delete that database—do not use it to restart. Native mode stops with Ctrl+C in its terminal. Changing initial credentials in `.env` does not change credentials in an existing Docker volume or native cluster.

## Migrations and initialization

`bun run db:migrate` applies the checked-in initial and `202610010001_learning_engine` migrations. Running it again is safe and applies nothing when current. Docker/native initialization creates the database; migration creates its tables. Homework reference records and anonymous students are created on first use. Practice requires `bun run db:seed`; it refreshes development samples while existing practice sessions retain a content snapshot.

For an intentional future schema edit:

```sh
bun run db:migrate:dev --name describe_change
bun run db:generate
```

Review and commit the resulting migration. `migrate dev` is only for a disposable development database and needs permission to create a shadow database. Use `db:migrate` to apply reviewed migrations to other environments. If you previously used `db push`, do not reset or mark this migration applied blindly: inspect and reconcile the existing schema first.

## Try the learning loop

Enter `24 ÷ 6`. The guided answers are **12 → 12 → 2 → 4**. Try a wrong answer and the hint button. Reload or restart the API, then use “continue learning” to resume. The same browser cookie identifies the anonymous student.

Supported inputs are two-digit addition/subtraction (nonnegative results), multiplication with operands 2–10, and exact division with divisor and quotient 2–10. Free-form word problems, natural-language answers, OCR and voice are not supported. Practice includes a few predefined multiplication/division word problems. The curriculum templates need teacher validation.

## Try Day 2

Open `/practice`, choose **Хуваах → Тэнцүү хуваах**, and solve `24 ÷ 6`. Enter `18` to receive a subtraction-vs-division hint; two more incorrect attempts strengthen assistance. Answer `4`, then open `/progress`: three wrong attempts and a heavily assisted correct answer produce **36/100**, from the initial 50. The next division exercise is easy. Two clean medium successes instead move to hard.

These are configurable product assumptions, not an official assessment. No LLM is used. See [Day 2 implementation notes](docs/day-2.md) for rules, curriculum and limitations.

## Storage architecture and fallback

- `packages/database/repository.ts`: storage-neutral contract and conflict error.
- `packages/database/file.ts`: atomic JSON writes and a single-process queue.
- `packages/database/postgres.ts`: Prisma transactions, ordered events, concurrency checks and connection lifecycle.
- `packages/database/index.ts`: mode selection only.
- `packages/database/practice-postgres.ts`, `practice-file.ts`: atomic practice/mastery storage.
- `packages/learning-engine/`: pure hint, mistake, mastery, selection, context and progress functions.
- `packages/curriculum/sample.ts`: authored sample metadata and exercise templates.
- `apps/api/src/main.ts`: API boundary, storage lifecycle, conflict-to-HTTP mapping.

`.env.example` selects `STORAGE_MODE=postgres`. To run without PostgreSQL, explicitly set `STORAGE_MODE=file` and restart the API. Unset storage mode still defaults to file in development for backward compatibility. Unknown modes are rejected; production refuses file mode. An unavailable configured PostgreSQL database **never silently falls back to files**.

Existing file sessions remain in `.data/sessions` untouched. They are not automatically imported into PostgreSQL. Switching modes selects separate stores. File mode is for a single-process local demo, not multiple workers or a deployment.

## Models

| Model              | Current use                                                           |
| ------------------ | --------------------------------------------------------------------- |
| Student            | Anonymous browser identity, grade 3                                   |
| Subject            | Mathematics reference                                                 |
| Topic              | Current arithmetic topic                                              |
| Problem            | Canonical problem shared within a topic                               |
| LearningSession    | Progress, version, hint counters, state, timestamps                   |
| Attempt            | Answer, correctness, step, hint level, explicit order                 |
| TutorMessage       | Ordered student/tutor conversation                                    |
| Mastery            | Experimental per-student/per-skill score; legacy topic rows preserved |
| Skill              | Grade/topic-linked learning concept                                   |
| CurriculumExercise | Versioned sample content, difficulty, hints and mistake patterns      |
| MasteryEvent       | Before/after score and delta; one per practice attempt                |

Prisma also manages `_prisma_migrations`. Day 2 reuses sessions, attempts and messages; practice adds a content snapshot/exercise link and attempts can record a detected mistake.

## Verification

```sh
bun run lint
bun run typecheck
bun run test
bun run build:api
bun run build
```

For actual PostgreSQL tests, set `TEST_DATABASE_URL` in `.env` to a **dedicated schema named `joy_test_<name>`** on your local database (see `.env.example`):

```sh
bun run test:postgres
```

The test command compiles the API and applies migrations to that test schema. It fails rather than skipping when configuration is absent. Tests remove only their own students/sessions; canonical reference rows and the test schema remain for repeat runs. The isolated HTTP restart test uses port 15301.

With both app servers running:

```sh
bunx playwright install chromium
TEST_BASE_URL=http://localhost:5126 EXPECT_STORAGE_MODE=postgres bun run test:e2e
```

Browser tests assert the selected backend and cover the complete learning loop, reload/resume, mobile layout, unsupported inputs, session isolation and stale turns. Screenshots go to ignored `.data/`.

Actual PostgreSQL 17.10 verification: initial migration, transactional history, separate connections, concurrent creation, stale turns, rollback, API process restart/resume, and an identical persisted-session snapshot after a PostgreSQL server restart. Docker Compose is provided but was not executed on this machine because Docker is absent.

## Remaining technical debt

This is ready for local persistence development, not a public child-data deployment. Anonymous cookie tokens are not real authentication; the API must remain private. Before a pilot, add account authorization, retention/deletion rules, request limits and backup/restore procedures. Practice snapshots preserve existing content; the older homework templates still need versioning before changes. File-to-PostgreSQL import is not implemented. Mastery is an unvalidated deterministic score, not proof of independent learning. History/progress queries are unpaginated, and the sample skill catalog is still maintained in code; content publishing and larger-scale queries are future work.

The web app stays at the repository root; `apps/api` contains NestJS, and `packages/ai-tutor`, `curriculum`, `learning-engine`, `database`, and `shared` isolate the existing logic. Day 1 homework behavior is preserved alongside the new practice UI.
