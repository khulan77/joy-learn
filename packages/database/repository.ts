import type { StructuredExercise, MasteryChange } from "../shared/practice";
import type { Session } from "../shared";

/** Storage contract; the tutor has no dependency on either adapter. */
export interface SessionRepository {
  readonly mode: "file" | "postgres";
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  curriculum(): Promise<StructuredExercise[]>;
  practiceSessions(studentId: string): Promise<Session[]>;
  masteryHistory(studentId: string): Promise<MasteryChange[]>;
  get(id: string): Promise<Session | null>;
  save(session: Session, expectedVersion?: number): Promise<void>;
}

export class PersistenceConflictError extends Error {
  constructor() {
    super("The session has changed; reload before submitting another turn.");
  }
}
