import { afterEach, expect, test, setSystemTime, spyOn } from "bun:test";
import * as schema from "../src/server/schema";
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

test("origens externas e endpoints não publicados são recusados; cookie de produção é seguro", async () => {
  const app = await createAccessFixture(true);
  fixtures.push(app);
  expect(
    (
      await app.request(
        "/sign-in/email",
        { email, password: app.password },
        undefined,
        "192.0.2.1",
        "https://outro.test",
      )
    ).status,
  ).toBe(403);
  expect((await app.request("/sign-up/email", {})).status).toBe(404);
  expect((await app.request("/list-sessions")).status).toBe(404);
  expect(
    (await app.request("/update-user", { name: "Outro nome" })).status,
  ).toBe(404);
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
  ).toBe(403);
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
  expect(login.headers.get("cache-control")).toBe("no-store");
  await expect(app.setPassword("curta")).rejects.toThrow("15");
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

test("o handler nativo valida o login e o hook restringe a identidade pessoal", async () => {
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

test("leituras HTTP e do servidor recusam uma sessão sem revisão confirmada", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const cookie = app.cookie(
    await app.request("/sign-in/email", { email, password: app.password }),
  );
  expect(await app.readSession(cookie)).not.toBeNull();
  expect(
    (
      await (
        await app.request("/get-session?disableRefresh=true", undefined, cookie)
      ).json()
    ).session,
  ).toBeDefined();
  await app.db.update(schema.session).set({ credentialVersion: null });
  expect(await app.readSession(cookie)).toBeNull();
  expect(
    await (
      await app.request("/get-session?disableRefresh=true", undefined, cookie)
    ).json(),
  ).toBeNull();
});

test("redefinição entre verificação da senha e criação da sessão recusa o login pendente", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const reachedInsert = Promise.withResolvers<void>();
  const resumeInsert = Promise.withResolvers<void>();
  const originalInsert = app.db.insert.bind(app.db);
  // Hold the real SQLite insert after native password verification. Reset uses
  // the real access interface while the sign-in is paused at this exact point.
  const insertion = spyOn(app.db, "insert").mockImplementation((table) => {
    const builder = originalInsert(table);
    if (Object.is(table, schema.session)) {
      const values = builder.values.bind(builder);
      builder.values = ((...args: Parameters<typeof values>) => {
        const query = values(...args);
        const returning = query.returning.bind(query);
        query.returning = (async () => {
          reachedInsert.resolve();
          await resumeInsert.promise;
          return await returning();
        }) as unknown as typeof query.returning;
        return query;
      }) as typeof builder.values;
    }
    return builder;
  });
  const pendingLogin = app.request("/sign-in/email", {
    email,
    password: app.password,
  });
  try {
    await reachedInsert.promise;
    await app.setPassword("senha substituta longa para concorrencia");
    resumeInsert.resolve();
    const response = await pendingLogin;
    expect(response.status).toBe(401);
    expect((await response.json()).message).toContain("redefinida");
    expect(await app.db.select().from(schema.session)).toHaveLength(0);
    expect(await app.readSession(app.cookie(response))).toBeNull();
  } finally {
    resumeInsert.resolve();
    await pendingLogin;
    insertion.mockRestore();
  }
});
