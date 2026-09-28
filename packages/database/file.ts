import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Session } from "../shared";
import { PersistenceConflictError, type SessionRepository } from "./repository";
export class FileRepository implements SessionRepository {
  mode = "file" as const;
  private queue: Promise<void> = Promise.resolve();
  constructor(private directory = join(process.cwd(), ".data/sessions")) {}
  async connect() {
    await mkdir(this.directory, { recursive: true });
  }
  async disconnect() {
    await this.queue;
  }
  async get(id: string): Promise<Session | null> {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    try {
      return JSON.parse(
        await readFile(join(this.directory, `${id}.json`), "utf8"),
      ) as Session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async save(session: Session, expectedVersion?: number) {
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
