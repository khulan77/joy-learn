import { expect, test } from "bun:test";
import { repository } from "../packages/database";

test("development file fallback is explicit or unset; invalid settings fail closed", async () => {
  const file = repository({ NODE_ENV: "development" });
  expect(file.mode).toBe("file");
  await file.disconnect();
  expect(repository({ STORAGE_MODE: "file" }).mode).toBe("file");
  expect(() => repository({ STORAGE_MODE: "postgress" })).toThrow(
    "STORAGE_MODE",
  );
  expect(() => repository({ STORAGE_MODE: "postgres" })).toThrow(
    "DATABASE_URL",
  );
  expect(() =>
    repository({ NODE_ENV: "production", STORAGE_MODE: "file" }),
  ).toThrow("Production");
  expect(() => repository({ NODE_ENV: "production" })).toThrow("Production");
});
