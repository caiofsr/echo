import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  atomicWrites,
  migrateDatabase,
  openDatabase,
} from "../src/server/database";
import { loginAttempt } from "../src/server/schema";

test("uma falha reverte todas as escritas na transação SQLite nativa", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-transaction-"));
  const database = openDatabase(`file:${join(dir, "test.db")}`);
  try {
    await migrateDatabase(database.db);
    await expect(
      atomicWrites(database.db, (tx) => [
        tx
          .insert(loginAttempt)
          .values({ origin: "same-origin", startedAt: 1, count: 1 }),
        tx
          .insert(loginAttempt)
          .values({ origin: "same-origin", startedAt: 2, count: 2 }),
      ]),
    ).rejects.toThrow();
    expect(await database.db.select().from(loginAttempt)).toEqual([]);
  } finally {
    database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
