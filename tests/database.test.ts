import { test, expect } from "bun:test";
import {
  mkdtemp,
  rm,
  mkdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createAccess } from "./helpers/create-access";
import * as schema from "../src/db/schema";

test("remover a revisão preserva credencial e sessão de um banco existente", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-migration-"));
  const database = openDatabase(`file:${join(dir, "test.db")}`);
  try {
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    );
    journal.entries = journal.entries.filter(
      (entry: { idx: number }) => entry.idx < 3,
    );
    const previous = join(dir, "previous");
    await mkdir(join(previous, "meta"), { recursive: true });
    await writeFile(
      join(previous, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    for (const entry of journal.entries)
      await copyFile(
        `drizzle/${entry.tag}.sql`,
        join(previous, `${entry.tag}.sql`),
      );
    migrate(database.db, { migrationsFolder: previous });
    const { auth, setPassword } = createAccess(database.db, {
      baseURL: "https://echo.test",
      secret: "test-only-secret-at-least-thirty-two-characters",
      secureCookies: false,
    });
    await setPassword("uma senha longa para migracao");
    const response = await auth.handler(
      new Request("https://echo.test/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          origin: "https://echo.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "owner@echo.invalid",
          password: "uma senha longa para migracao",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const accounts = await database.db.select().from(schema.account);
    const sessions = await database.db.select().from(schema.session);
    await migrateDatabase(database.db);
    expect(await database.db.select().from(schema.account)).toEqual(accounts);
    expect(await database.db.select().from(schema.session)).toEqual(sessions);
    expect(
      await auth.api.getSession({
        headers: new Headers({ cookie }),
        query: { disableRefresh: true },
      }),
    ).not.toBeNull();
    for (const table of ["user", "session"]) {
      const columns = database.db.all<{ name: string }>(
        sql`PRAGMA table_info(${sql.identifier(table)})`,
      );
      expect(columns.map((column) => column.name)).not.toContain(
        "credential_version",
      );
    }
  } finally {
    database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
