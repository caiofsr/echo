import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, migrateDatabase } from "../../src/server/database";
import { createAccess } from "../../src/server/access";

export async function createAccessFixture(secureCookies = false) {
  const dir = await mkdtemp(join(tmpdir(), "echo-test-"));
  const url = `file:${join(dir, "test.db")}`;
  let database = openDatabase(url);
  await migrateDatabase(database.db);
  const options = {
    baseURL: "https://echo.test",
    secret: "test-only-secret-at-least-thirty-two-characters",
    secureCookies,
  };
  let access = createAccess(database.db, options);
  const password = "uma frase longa para os testes";
  await access.setPassword(password);
  return {
    password,
    request(
      action: string,
      body?: unknown,
      cookie?: string,
      address = "192.0.2.1",
      origin = options.baseURL,
    ) {
      return access.handle(
        new Request(`${options.baseURL}/api/access/${action}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            origin,
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        address,
      );
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
