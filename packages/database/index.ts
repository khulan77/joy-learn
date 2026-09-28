import { PrismaClient } from "@prisma/client";
import { FileRepository } from "./file";
import { PostgresRepository } from "./postgres";
import type { SessionRepository } from "./repository";
export { FileRepository } from "./file";
export { PostgresRepository } from "./postgres";
export { PersistenceConflictError, type SessionRepository } from "./repository";

export function repository(
  env: {
    STORAGE_MODE?: string;
    DATABASE_URL?: string;
    NODE_ENV?: string;
  } = process.env,
): SessionRepository {
  const mode = env.STORAGE_MODE ?? "file";
  if (mode !== "file" && mode !== "postgres")
    throw new Error("STORAGE_MODE must be file or postgres");
  if (mode === "postgres") {
    if (!env.DATABASE_URL)
      throw new Error("DATABASE_URL is required for postgres storage");
    return new PostgresRepository(
      new PrismaClient({ datasourceUrl: env.DATABASE_URL }),
    );
  }
  if (env.NODE_ENV === "production")
    throw new Error("Production requires STORAGE_MODE=postgres");
  return new FileRepository();
}
