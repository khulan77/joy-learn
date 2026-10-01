import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Session } from "../shared";
import type { MasteryChange } from "../shared/practice";
import { masteryConfig, updateMastery } from "../learning-engine";
import { PersistenceConflictError } from "./repository";
interface State {
  sessions: Record<string, Session>;
  history: MasteryChange[];
}
/** Single-process demo only. One atomic snapshot includes both session and mastery. */
export class FilePracticeStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(private directory: string) {}
  private async read(): Promise<State> {
    try {
      return JSON.parse(
        await readFile(join(this.directory, "practice-state.json"), "utf8"),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        return { sessions: {}, history: [] };
      throw e;
    }
  }
  async get(id: string) {
    return (await this.read()).sessions[id] ?? null;
  }
  async sessions(studentId: string) {
    return Object.values((await this.read()).sessions)
      .filter((s) => s.studentId === studentId)
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      );
  }
  async history(studentId: string) {
    const data = await this.read();
    return data.history.filter(
      (e) => data.sessions[e.sessionId]?.studentId === studentId,
    );
  }
  async disconnect() {
    await this.queue;
  }
  async save(s: Session, expectedVersion?: number) {
    const task = this.queue.then(async () => {
      const data = await this.read(),
        current = data.sessions[s.id];
      if (expectedVersion !== undefined && current?.version !== expectedVersion)
        throw new PersistenceConflictError();
      if (expectedVersion === undefined && current)
        throw new PersistenceConflictError();
      const skillId = s.practice!.skill.id;
      let score =
        data.history
          .filter(
            (e) =>
              e.skillId === skillId &&
              data.sessions[e.sessionId]?.studentId === s.studentId,
          )
          .at(-1)?.after ?? masteryConfig.initial;
      for (const a of s.attempts.slice(current?.attempts.length ?? 0)) {
        const after = updateMastery(score, a);
        data.history.push({
          attemptId: a.id,
          sessionId: s.id,
          skillId,
          before: score,
          after,
          delta: after - score,
          createdAt: a.createdAt,
        });
        score = after;
      }
      data.sessions[s.id] = s;
      await mkdir(this.directory, { recursive: true });
      const target = join(this.directory, "practice-state.json"),
        tmp = `${target}.${crypto.randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
      await rename(tmp, target);
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
