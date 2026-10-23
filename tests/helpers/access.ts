import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, migrateDatabase } from "../../src/db/connection";
import { createAccess } from "./create-access";

export async function createAccessFixture() {
  const dir = await mkdtemp(join(tmpdir(), "echo-test-"));
  const url = `file:${join(dir, "test.db")}`;
  let database = openDatabase(url);
  await migrateDatabase(database.db);
  const options = {
    baseURL: "https://echo.test",
    secret: "test-only-secret-at-least-thirty-two-characters",
  };
  let access = createAccess(database.db, options);
  const password = "uma frase longa para os testes";
  await access.setPassword(password);
  return {
    password,
    request(
      path: string,
      body?: unknown,
      cookie?: string,
      address = "192.0.2.1",
      origin = options.baseURL,
    ) {
      const url = new URL(`/api/auth${path}`, options.baseURL);
      const method = body === undefined ? "GET" : "POST";
      return access.auth.handler(
        new Request(url, {
          method,
          headers: {
            origin,
            "x-echo-client-ip": address,
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
    },
    get db() {
      return database.db;
    },
    readSession(cookie?: string) {
      return access.auth.api.getSession({
        headers: new Headers(cookie ? { cookie } : {}),
        query: { disableRefresh: true },
      });
    },
    cookie(response: Response) {
      return response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
    },
    setPassword(password: string) {
      return access.setPassword(password);
    },
    async restart() {
      database.close();
      database = openDatabase(url);
      access = createAccess(database.db, options);
    },
    async close() {
      database.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
