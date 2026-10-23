import { afterEach, expect, test, setSystemTime } from "bun:test";
import * as schema from "../src/db/schema";
import { createAccessFixture } from "./helpers/access";

const email = "owner@echo.invalid";
const fixtures: Awaited<ReturnType<typeof createAccessFixture>>[] = [];
afterEach(async () => {
  setSystemTime();
  for (const fixture of fixtures.splice(0)) await fixture.close();
});

test("a senha pessoal abre uma sessão persistida e protege o acesso sem cookie", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  expect(
    await (await app.request("/get-session?disableRefresh=true")).json(),
  ).toBeNull();
  expect(await app.readSession()).toBeNull();
  const login = await app.request("/sign-in/email", {
    email,
    password: app.password,
  });
  expect(login.status).toBe(200);
  expect(login.headers.get("set-cookie")).toContain("HttpOnly");
  const cookie = app.cookie(login);
  expect(
    (await app.request("/get-session?disableRefresh=true", undefined, cookie))
      .status,
  ).toBe(200);
  await app.restart();
  expect(
    (await app.request("/get-session?disableRefresh=true", undefined, cookie))
      .status,
  ).toBe(200);
});

test("sair encerra somente a sessão atual e redefinir a senha revoga todas", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const first = app.cookie(
    await app.request("/sign-in/email", { email, password: app.password }),
  );
  const second = app.cookie(
    await app.request("/sign-in/email", { email, password: app.password }),
  );
  expect((await app.request("/sign-out", {}, first)).status).toBe(200);
  expect(
    await (
      await app.request("/get-session?disableRefresh=true", undefined, first)
    ).json(),
  ).toBeNull();
  expect(await app.readSession(first)).toBeNull();
  expect(
    (await app.request("/get-session?disableRefresh=true", undefined, second))
      .status,
  ).toBe(200);
  await app.setPassword("outra frase pessoal bem longa");
  expect(
    await (
      await app.request("/get-session?disableRefresh=true", undefined, second)
    ).json(),
  ).toBeNull();
  expect(await app.readSession(second)).toBeNull();
  expect(
    (await app.request("/sign-in/email", { email, password: app.password }))
      .status,
  ).toBe(401);
  expect(
    (
      await app.request("/sign-in/email", {
        email,
        password: "outra frase pessoal bem longa",
      })
    ).status,
  ).toBe(200);
});

const DAY = 24 * 60 * 60 * 1000;

test("leituras não renovam a sessão, atividade renova por 30 dias e inatividade expira", async () => {
  const start = new Date("2026-10-22T12:00:00Z");
  setSystemTime(start);
  const app = await createAccessFixture();
  fixtures.push(app);
  const cookie = app.cookie(
    await app.request("/sign-in/email", { email, password: app.password }),
  );
  setSystemTime(new Date(start.getTime() + 29 * DAY));
  const passive = await app.request(
    "/get-session?disableRefresh=true",
    undefined,
    cookie,
  );
  expect((await passive.json()).session.expiresAt).toBe(
    "2026-11-21T12:00:00.000Z",
  );
  const active = await app.request("/get-session", undefined, cookie);
  expect((await active.json()).session.expiresAt).toBe(
    "2026-12-20T12:00:00.000Z",
  );
  setSystemTime(new Date(start.getTime() + 31 * DAY));
  expect(
    (await app.request("/get-session?disableRefresh=true", undefined, cookie))
      .status,
  ).toBe(200);
  setSystemTime(new Date(start.getTime() + 60 * DAY));
  expect(
    await (
      await app.request("/get-session?disableRefresh=true", undefined, cookie)
    ).json(),
  ).toBeNull();
  expect(await app.readSession(cookie)).toBeNull();
});

test("tentativas são limitadas por origem, persistem após reinício e liberam após espera", async () => {
  const start = new Date("2026-10-22T12:00:00Z");
  setSystemTime(start);
  const app = await createAccessFixture();
  fixtures.push(app);
  for (let i = 0; i < 5; i++)
    expect(
      (await app.request("/sign-in/email", { email, password: "errada" }))
        .status,
    ).toBe(401);
  await app.restart();
  const blocked = await app.request("/sign-in/email", {
    email,
    password: app.password,
  });
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get("x-retry-after")).toBe("60");
  expect(
    (
      await app.request(
        "/sign-in/email",
        { email, password: app.password },
        undefined,
        "192.0.2.2",
      )
    ).status,
  ).toBe(200);
  setSystemTime(new Date(start.getTime() + 61_000));
  expect(
    (await app.request("/sign-in/email", { email, password: app.password }))
      .status,
  ).toBe(200);
});

test("proteções nativas de origem, sessão e cadastro permanecem ativas", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const rejectedOrigin = await app.request(
    "/sign-in/email",
    { email, password: app.password },
    undefined,
    "192.0.2.1",
    "https://outro.test",
  );
  expect(rejectedOrigin.status).toBe(403);
  expect((await rejectedOrigin.json()).code).toBe("INVALID_ORIGIN");
  const signUp = await app.request("/sign-up/email", {
    email: "other@example.com",
    password: app.password,
    name: "Outra conta",
  });
  expect(signUp.status).toBe(400);
  expect((await signUp.json()).code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
  expect((await app.request("/list-sessions")).status).toBe(401);
  expect(
    (await app.request("/update-user", { name: "Outro nome" })).status,
  ).toBe(401);
  // Native Better Auth accepts non-browser callers without Origin/metadata.
  expect(
    (
      await app.request(
        "/sign-in/email",
        { email, password: app.password },
        undefined,
        "192.0.2.1",
        "",
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await app.request(
        "/sign-in/email",
        { email, password: app.password },
        undefined,
        "192.0.2.1",
        "https://echo.test:444",
      )
    ).status,
  ).toBe(403);
  const login = await app.request("/sign-in/email", {
    email,
    password: app.password,
  });
  expect(login.headers.get("set-cookie")).toContain("Secure");
  expect(login.headers.get("set-cookie")).toContain("SameSite=Lax");
  const session = await app.request(
    "/get-session?disableRefresh=true",
    undefined,
    app.cookie(login),
  );
  expect(session.headers.get("cache-control")).toBe("no-store");
  const sessions = await app.request(
    "/list-sessions",
    undefined,
    app.cookie(login),
  );
  expect(sessions.status).toBe(200);
  expect(Array.isArray(await sessions.json())).toBe(true);
  expect(
    (
      await app.request(
        "/update-user",
        { name: "Nome atualizado" },
        app.cookie(login),
      )
    ).status,
  ).toBe(200);
  expect((await app.readSession(app.cookie(login)))?.user.name).toBe(
    "Nome atualizado",
  );
  await expect(app.setPassword("curta")).rejects.toMatchObject({
    body: { code: "PASSWORD_TOO_SHORT" },
  });
});

test("o limite nativo mantém cinco tentativas mesmo com requisições concorrentes", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      app.request("/sign-in/email", { email, password: "errada" }),
    ),
  );
  expect(responses.filter((response) => response.status === 401)).toHaveLength(
    5,
  );
  expect(responses.filter((response) => response.status === 429)).toHaveLength(
    3,
  );
});

test("o handler nativo valida o login e recusa credenciais desconhecidas", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  expect(
    (await app.request("/sign-in/email", { email, password: 123 })).status,
  ).toBe(400);
  const oversized = await app.request("/sign-in/email", {
    email,
    password: "a".repeat(1025),
  });
  expect(oversized.status).toBe(400);
  expect((await oversized.json()).code).toBe("PASSWORD_TOO_LONG");
  expect(
    (
      await app.request("/sign-in/email", {
        email: "other@example.com",
        password: app.password,
      })
    ).status,
  ).toBe(401);
  expect(
    (await app.request("/sign-in/email", { email, password: app.password }))
      .status,
  ).toBe(200);
});

test("Better Auth recusa a credencial ausente sem resposta customizada", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  await app.db.delete(schema.user);
  const response = await app.request("/sign-in/email", {
    email,
    password: app.password,
  });
  expect(response.status).toBe(401);
  expect((await response.json()).code).toBe("INVALID_EMAIL_OR_PASSWORD");
  expect(await app.db.select().from(schema.session)).toHaveLength(0);
});

test("reset nativo valida a senha antes de revogar e recusa tokens inválidos", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const cookie = app.cookie(
    await app.request("/sign-in/email", { email, password: app.password }),
  );
  await expect(app.setPassword("curta")).rejects.toMatchObject({
    body: { code: "PASSWORD_TOO_SHORT" },
  });
  expect(await app.readSession(cookie)).not.toBeNull();
  expect(
    (await app.request("/sign-in/email", { email, password: app.password }))
      .status,
  ).toBe(200);
  const publicReset = await app.request("/request-password-reset", { email });
  expect(publicReset.status).toBe(400);
  expect((await publicReset.json()).code).toBe("RESET_PASSWORD_DISABLED");
  expect(
    (
      await app.request("/reset-password", {
        token: "invalid",
        newPassword: app.password,
      })
    ).status,
  ).toBe(400);
  await app.setPassword("uma nova senha pessoal longa");
  expect(await app.readSession(cookie)).toBeNull();
  expect(await app.db.select().from(schema.session)).toHaveLength(0);
});
