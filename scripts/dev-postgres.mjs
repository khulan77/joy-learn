// Optional local PostgreSQL runner for machines without Docker. Never a production service.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_PORT = "5432",
} = process.env;
if (
  !POSTGRES_USER ||
  !POSTGRES_PASSWORD ||
  !POSTGRES_DB ||
  !/^[a-z][a-z0-9_]*$/.test(POSTGRES_DB)
) {
  throw new Error(
    "Set POSTGRES_USER, POSTGRES_PASSWORD and a simple lowercase POSTGRES_DB in .env first.",
  );
}
const port = Number(POSTGRES_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid POSTGRES_PORT");
const runtimePath = resolve(
  ".data/postgres-runtime/node_modules/embedded-postgres/dist/index.js",
);
if (!existsSync(runtimePath))
  throw new Error(
    "Run bun run db:native:install first, or use Docker with bun run db:up.",
  );
const { default: EmbeddedPostgres } = await import(runtimePath);
const databaseDir = resolve(".data/pg17");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  port,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
try {
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  try {
    const exists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [POSTGRES_DB],
    );
    if (!exists.rowCount) await pg.createDatabase(POSTGRES_DB);
    console.log(
      `PostgreSQL ready on 127.0.0.1:${port}. Data persists in .data/pg17. Keep this terminal open; Ctrl+C stops the server.`,
    );
  } finally {
    await client.end();
  }
} catch {
  console.error(
    "PostgreSQL could not start. Check port availability, runtime installation, and credentials matching the existing cluster. Existing data was not reset.",
  );
  process.exitCode = 1;
}
