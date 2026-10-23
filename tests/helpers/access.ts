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
      const path =
        action === "login"
          ? "/sign-in/email"
          : action === "logout"
            ? "/sign-out"
            : action === "sign-up"
              ? "/sign-up/email"
              : "/get-session";
      const method =
        action === "session" || action === "activity" ? "GET" : "POST";
      const requestBody =
        action === "login"
          ? { email: "owner@echo.invalid", ...(body as object) }
          : method === "POST"
            ? body
            : undefined;
      const url = new URL(`/api/auth${path}`, options.baseURL);
      if (action === "session") url.searchParams.set("disableRefresh", "true");
      return access
        .handleAuth(
          new Request(url, {
            method,
            headers: {
              origin,
              "content-type": "application/json",
              ...(cookie ? { cookie } : {}),
            },
            ...(requestBody === undefined
              ? {}
              : { body: JSON.stringify(requestBody) }),
          }),
          address,
        )
        .then(async (response) => {
          if (action !== "session" && action !== "activity") return response;
          const payload = await response.clone().json();
          const session = payload?.session ?? payload;
          return session?.expiresAt
            ? Response.json({ expiresAt: session.expiresAt })
            : Response.json(
                { message: "Entre para continuar." },
                { status: 401 },
              );
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
