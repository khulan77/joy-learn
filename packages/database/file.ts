import { FilePracticeStore } from "./practice-file";
import { sampleExercises } from "../curriculum/sample";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Session } from "../shared";
import { PersistenceConflictError, type SessionRepository } from "./repository";
export class FileRepository implements SessionRepository {
  mode = "file" as const;
  private queue: Promise<void> = Promise.resolve();
  private practiceStore: FilePracticeStore;
  constructor(private directory = join(process.cwd(), ".data/sessions")) {
    this.practiceStore = new FilePracticeStore(directory);
  }
  async curriculum() {
    return sampleExercises;
  }
  practiceSessions(studentId: string) {
    return this.practiceStore.sessions(studentId);
  }
  masteryHistory(studentId: string) {
    return this.practiceStore.history(studentId);
  }
  async connect() {
    await mkdir(this.directory, { recursive: true });
  }
  async disconnect() {
    await this.queue;
    await this.practiceStore.disconnect();
  }
  async get(id: string): Promise<Session | null> {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    try {
      return JSON.parse(
        await readFile(join(this.directory, `${id}.json`), "utf8"),
      ) as Session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return this.practiceStore.get(id);
      throw error;
    }
  }
  async save(session: Session, expectedVersion?: number) {
    if (session.practice)
      return this.practiceStore.save(session, expectedVersion);
    const task = this.queue.then(async () => {
      const current = await this.get(session.id);
      if (expectedVersion !== undefined && current?.version !== expectedVersion)
        throw new PersistenceConflictError();
      await mkdir(this.directory, { recursive: true });
      const target = join(this.directory, `${session.id}.json`);
      const temporary = `${target}.${crypto.randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(session), { mode: 0o600 });
      await rename(temporary, target);
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
