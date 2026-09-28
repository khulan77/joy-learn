# Day 1 architecture and boundaries

## Initial assessment

The repository was a fresh create-next-app starter (Next.js 16.3.6, React 19.2.8, Tailwind 4, TypeScript, Bun), not the old Joy Learn prototype. Existing edits to package.json and bun.lock added Bun types; these were preserved. No old product assets were available to classify. The existing Next.js setup and tooling were kept; starter pages were replaced.

## Learning engine

UI → same-origin Next proxy → NestJS → TutorService → curriculum → repository.

The rules engine owns correctness, progression and hints. Each successful attempt advances exactly one step. Mistakes keep the current step and increase assistance to a maximum of two levels; repeated requests reuse the stronger explanation. Hint requests are messages rather than attempts. Completion is recorded only after the final step. Rules do not interpret natural-language reasoning. An AIProvider interface and separate instructions are extension points, not an active AI integration. No credentials or paid AI model are required.

Curriculum templates are the source of truth; no model invents exercises. Today they live in code. A production curriculum can move authored steps, skills, concepts and content versions to storage after teacher validation. Persisted sessions currently regenerate steps from code, so templates must remain stable while sessions exist; introduce curriculum versioning before changing live content.

## Schema

Student → LearningSession → Problem → Topic → Subject. Attempt and TutorMessage preserve separate analytical events. Session tracks step, hint level, total hints, state and version. Messages have explicit positions to preserve order when timestamps coincide. Attempts retain the step and hint level at submission.

Problem text is canonicalized and reused within a topic. Grade is currently fixed at three. A nullable Mastery score is reserved for future evidence-based assessment; completing a guided exercise does not populate it. Avoiding separate skill/concept/hint tables on Day 1 keeps the schema small without foreclosing those relationships.

PostgreSQL saves a turn and its events in one transaction. Optimistic version checks reject conflicting submissions. File storage uses atomic rename and a single-process write queue; it is intentionally restricted to development.

## Scope and remaining work

There is no real AI provider, OCR, voice, parent or teacher dashboard, account system, gamification, curriculum accreditation, or measured mastery. Demo student identities are pseudonymous cookie tokens; their possession grants access to that browser's sessions. The private API trusts the proxy and binds to loopback. Production deployment requires stronger authentication and operational protections.

PostgreSQL 17.10 has now been verified against the checked-in initial migration. See the persistence completion section below. Browser screenshots and test results remain local artifacts under `.data`.

## Verification completed

- ESLint and web/API TypeScript checks passed.
- Next.js production build and NestJS compilation passed.
- Four unit/repository tests passed (31 assertions).
- Three Playwright tests passed: full tutoring and resume, mobile/unsupported inputs, and browser identity isolation/version conflicts.
- Desktop and mobile screenshots reviewed; no horizontal overflow at 390px.
- Local verification used web port 3002 because port 3000 belongs to another project. API uses port 3001. Default setup instructions use port 3000; override with `bun run dev --port 3002` and `TEST_BASE_URL=http://localhost:3002 bun run test:e2e` as needed.

## Persistence completion

The original adapter was split into `repository.ts`, `file.ts`, `postgres.ts` and the mode-selecting `index.ts`. Database errors no longer depend on TutorService. NestJS checks storage at startup and disconnects on shutdown. PostgreSQL failures do not trigger silent file fallback.

The initial migration creates all eight existing models; Attempt gains an explicit per-session position to resolve timestamp ties. Session turns append only new events in the same transaction as their version-checked progress update. A real PostgreSQL concurrency test exposed a race in Prisma reference-data upserts; conflict-safe inserts now handle simultaneous creation of shared students/topics/problems.

PostgreSQL was provisioned as a native local process because Docker is unavailable on this Mac. Compose is the standard reproducible alternative, with loopback-only publishing, a health check and a named volume. The optional native runner uses the same variables and a separate persistent directory. Neither startup option resets data.

Integration tests use an explicitly named test schema and restart an isolated NestJS process between saving and resuming. They verify exact conversation/attempt restoration, hint counters, completion, transaction rollback and concurrency. Browser tests against the main API explicitly assert `storage=postgres`.

No file sessions were deleted or imported; switching storage modes intentionally selects a different data store. PostgreSQL verification supersedes the earlier Day 1 limitation above. See README for current startup and migration commands.


Final persistence verification: 5 unit/configuration tests, 5 PostgreSQL integration tests and 3 browser tests passed. Lint, TypeScript, API compilation and the Next.js production build passed. A PostgreSQL server restart preserved an identical snapshot of all 3 browser-created sessions, including attempts and messages. Reapplying the migration reported no pending migrations. The Docker Compose runtime itself was not tested because Docker is not installed; the native PostgreSQL runner was tested instead.
