import { afterAll, beforeAll, expect, test } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import {
  PostgresRepository,
  PersistenceConflictError,
} from "../packages/database";
import { TutorService } from "../packages/ai-tutor";
import type { SessionView } from "../packages/shared";

// Never silently skip or accidentally exercise a normal development/production schema.
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !/^joy_test_[a-z0-9_]+$/.test(new URL(url).searchParams.get("schema") ?? "")
) {
  throw new Error(
    "Set TEST_DATABASE_URL with an isolated schema named joy_test_<name> before running test:postgres.",
  );
}
const db = new PrismaClient({ datasourceUrl: url });
const tutor = new TutorService();
let repo = new PostgresRepository(db);
const studentIds: string[] = [];
let api: ChildProcess | undefined;
const port = 15301;
const origin = `http://127.0.0.1:${port}`;
function newStudent() {
  const id = crypto.randomUUID();
  studentIds.push(id);
  return id;
}

beforeAll(async () => {
  const migration = spawnSync("bun", ["run", "db:migrate"], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
  if (migration.status !== 0)
    throw new Error(
      "Test migration failed. Check TEST_DATABASE_URL and PostgreSQL availability.",
    );
  await repo.connect();
}, 30000);

afterAll(async () => {
  await stopApi();
  // Delete only records created by this run. Do not reset/drop any database or schema.
  await db.learningSession.deleteMany({
    where: { studentId: { in: studentIds } },
  });
  await db.student.deleteMany({ where: { id: { in: studentIds } } });
  await repo.disconnect();
  await db.$disconnect();
});

async function stopApi() {
  if (!api || api.exitCode !== null || api.signalCode !== null) return;
  const process = api;
  const exited = once(process, "exit");
  process.kill("SIGTERM");
  const timeout = setTimeout(() => process.kill("SIGKILL"), 5000);
  await exited;
  clearTimeout(timeout);
  api = undefined;
}
async function startApi() {
  api = spawn("node", ["dist/apps/api/src/main.js"], {
    env: {
      ...process.env,
      DATABASE_URL: url,
      STORAGE_MODE: "postgres",
      API_PORT: String(port),
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null)
      throw new Error("Test API exited before listening");
    try {
      const r = await fetch(`${origin}/sessions/missing`);
      if (r.status === 401) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test API did not start");
}

test("PostgreSQL round-trip retains ordered events, hints and completion across new connections", async () => {
  let s = tutor.start("24 ÷ 6", newStudent());
  await repo.save(s);
  for (const input of [{ answer: "99" }, { hint: true }, { answer: "12" }]) {
    const next = tutor.respond(s, input);
    await repo.save(next, s.version);
    s = next;
  }
  await repo.disconnect();
  repo = new PostgresRepository(new PrismaClient({ datasourceUrl: url }));
  await repo.connect();
  expect(await repo.get(s.id)).toEqual(s);
  for (const answer of ["12", "2", "4"]) {
    const next = tutor.respond(s, { answer });
    await repo.save(next, s.version);
    s = next;
  }
  expect((await repo.get(s.id))?.status).toBe("completed");
  expect(await db.attempt.count({ where: { sessionId: s.id } })).toBe(5);
  expect(await db.tutorMessage.count({ where: { sessionId: s.id } })).toBe(13);
  expect(await db.mastery.count({ where: { studentId: s.studentId } })).toBe(0);
});

test("concurrent stale turns commit exactly once", async () => {
  const s = tutor.start("24 ÷ 6", newStudent());
  await repo.save(s);
  const next = tutor.respond(s, { answer: "12" });
  const results = await Promise.allSettled([
    repo.save(next, 0),
    repo.save(next, 0),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const failed = results.find((r) => r.status === "rejected");
  expect(
    failed &&
      failed.status === "rejected" &&
      failed.reason instanceof PersistenceConflictError,
  ).toBe(true);
  expect(await repo.get(s.id)).toEqual(next);
});

test("failed message insertion rolls back the session and attempt together", async () => {
  const s = tutor.start("23 + 15", newStudent());
  await repo.save(s);
  const next = tutor.respond(s, { answer: "33" });
  next.messages[next.messages.length - 1].id = s.messages[0].id;
  await expect(repo.save(next, 0)).rejects.toThrow();
  expect(await repo.get(s.id)).toEqual(s);
  expect(await db.attempt.count({ where: { sessionId: s.id } })).toBe(0);
});

test("parallel new sessions share one canonical curriculum problem", async () => {
  const student = newStudent();
  const sessions = Array.from({ length: 4 }, () =>
    tutor.start("42 - 17", student),
  );
  await Promise.all(sessions.map((s) => repo.save(s)));
  expect(
    await db.learningSession.count({ where: { studentId: student } }),
  ).toBe(4);
  expect(
    await db.problem.count({
      where: { text: "42 - 17", topicId: sessions[0].topic },
    }),
  ).toBe(1);
});

test("HTTP create → tutor turns → API restart → resume → complete uses PostgreSQL", async () => {
  await startApi();
  const headers = {
    "Content-Type": "application/json",
    "x-student-id": newStudent(),
  };
  const created = await fetch(`${origin}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ problem: "24 ÷ 6" }),
  });
  expect(created.status).toBe(201);
  let s = (await created.json()) as SessionView;
  expect(s.storage).toBe("postgres");
  const id = s.id;
  for (const input of [{ answer: "99" }, { hint: true }, { answer: "12" }]) {
    const response = await fetch(`${origin}/sessions/${id}/turns`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, version: s.version }),
    });
    expect(response.status).toBe(201);
    s = (await response.json()) as SessionView;
  }
  await stopApi();
  await startApi();
  const response = await fetch(`${origin}/sessions/${id}`, { headers });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(s);
  for (const answer of ["12", "2", "4"]) {
    const response = await fetch(`${origin}/sessions/${id}/turns`, {
      method: "POST",
      headers,
      body: JSON.stringify({ answer, version: s.version }),
    });
    expect(response.status).toBe(201);
    s = (await response.json()) as SessionView;
  }
  expect(s.status).toBe("completed");
  expect(s.hintsUsed).toBe(2);
  expect(await db.attempt.count({ where: { sessionId: id } })).toBe(5);
  await stopApi();
}, 30000);
