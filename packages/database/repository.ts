import type { Session } from "../shared";

/** Storage contract; the tutor has no dependency on either adapter. */
export interface SessionRepository {
  readonly mode: "file" | "postgres";
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get(id: string): Promise<Session | null>;
  save(session: Session, expectedVersion?: number): Promise<void>;
}

export class PersistenceConflictError extends Error {
  constructor() {
    super("The session has changed; reload before submitting another turn.");
  }
}
