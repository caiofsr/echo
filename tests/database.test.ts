import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createAccess } from "./helpers/create-access";
import * as schema from "../src/db/schema";

test("abertura recusa URL de esquema não suportado", async () => {
  await expect(openDatabase("postgres://db.invalid:5432/echo")).rejects.toThrow(
    /URL_SCHEME_NOT_SUPPORTED/,
  );
});

test("migration inicial pode ser reaplicada sem perder credencial ou sessão", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-migration-"));
  const database = await openDatabase(`file:${join(dir, "test.db")}`);
  try {
    await migrateDatabase(database.db);
    const { auth, setPassword } = createAccess(database.db, {
      baseURL: "https://echo.test",
      secret: "test-only-secret-at-least-thirty-two-characters",
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
    expect(
      await database.db.all<{ count: number }>(
        sql`select count(*) as count from __drizzle_migrations`,
      ),
    ).toEqual([{ count: 2 }]);
    expect(
      (
        await database.db.all<{ name: string }>(
          sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations' order by name`,
        )
      ).map((table) => table.name),
    ).toEqual([
      "account",
      "company_settings",
      "payment_method",
      "rate_limit",
      "session",
      "user",
      "verification",
    ]);
  } finally {
    database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
