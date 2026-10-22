import { afterEach, expect, test, setSystemTime } from "bun:test";
import { createAccessFixture } from "./helpers/access";

const fixtures: Awaited<ReturnType<typeof createAccessFixture>>[] = [];
afterEach(async () => {
  setSystemTime();
  for (const fixture of fixtures.splice(0)) await fixture.close();
});

test("a senha pessoal abre uma sessão persistida e protege o acesso sem cookie", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  expect((await app.request("session")).status).toBe(401);
  const login = await app.request("login", { password: app.password });
  expect(login.status).toBe(200);
  expect(login.headers.get("set-cookie")).toContain("HttpOnly");
  const cookie = app.cookie(login);
  expect((await app.request("session", undefined, cookie)).status).toBe(200);
  await app.restart();
  expect((await app.request("session", undefined, cookie)).status).toBe(200);
});

test("sair encerra somente a sessão atual e redefinir a senha revoga todas", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  const first = app.cookie(
    await app.request("login", { password: app.password }),
  );
  const second = app.cookie(
    await app.request("login", { password: app.password }),
  );
  expect((await app.request("logout", {}, first)).status).toBe(200);
  expect((await app.request("session", undefined, first)).status).toBe(401);
  expect((await app.request("session", undefined, second)).status).toBe(200);
  await app.setPassword("outra frase pessoal bem longa");
  expect((await app.request("session", undefined, second)).status).toBe(401);
  expect((await app.request("login", { password: app.password })).status).toBe(
    401,
  );
  expect(
    (await app.request("login", { password: "outra frase pessoal bem longa" }))
      .status,
  ).toBe(200);
});

const DAY = 24 * 60 * 60 * 1000;

test("leituras não renovam a sessão, atividade renova por 30 dias e inatividade expira", async () => {
  const start = new Date("2026-10-22T12:00:00Z");
  setSystemTime(start);
  const app = await createAccessFixture();
  fixtures.push(app);
  const cookie = app.cookie(
    await app.request("login", { password: app.password }),
  );
  setSystemTime(new Date(start.getTime() + 29 * DAY));
  const passive = await app.request("session", undefined, cookie);
  expect((await passive.json()).expiresAt).toBe("2026-11-21T12:00:00.000Z");
  const active = await app.request("activity", {}, cookie);
  expect((await active.json()).expiresAt).toBe("2026-12-20T12:00:00.000Z");
  setSystemTime(new Date(start.getTime() + 31 * DAY));
  expect((await app.request("session", undefined, cookie)).status).toBe(200);
  setSystemTime(new Date(start.getTime() + 60 * DAY));
  expect((await app.request("session", undefined, cookie)).status).toBe(401);
});

test("tentativas são limitadas por origem, persistem após reinício e liberam após espera", async () => {
  const start = new Date("2026-10-22T12:00:00Z");
  setSystemTime(start);
  const app = await createAccessFixture();
  fixtures.push(app);
  for (let i = 0; i < 5; i++)
    expect((await app.request("login", { password: "errada" })).status).toBe(
      401,
    );
  await app.restart();
  const blocked = await app.request("login", { password: app.password });
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get("retry-after")).toBe("60");
  expect(
    (
      await app.request(
        "login",
        { password: app.password },
        undefined,
        "192.0.2.2",
      )
    ).status,
  ).toBe(200);
  setSystemTime(new Date(start.getTime() + 61_000));
  expect((await app.request("login", { password: app.password })).status).toBe(
    200,
  );
});

test("origens externas e endpoints não publicados são recusados; cookie de produção é seguro", async () => {
  const app = await createAccessFixture(true);
  fixtures.push(app);
  expect(
    (
      await app.request(
        "login",
        { password: app.password },
        undefined,
        "192.0.2.1",
        "https://outro.test",
      )
    ).status,
  ).toBe(403);
  expect((await app.request("sign-up", {})).status).toBe(404);
  const login = await app.request("login", { password: app.password });
  expect(login.headers.get("set-cookie")).toContain("Secure");
  expect(login.headers.get("set-cookie")).toContain("SameSite=Lax");
  expect(login.headers.get("cache-control")).toBe("no-store");
  await expect(app.setPassword("curta")).rejects.toThrow("15");
});

test("entrada concorrente com redefinição nunca mantém acesso pela credencial anterior", async () => {
  const app = await createAccessFixture();
  fixtures.push(app);
  for (let i = 0; i < 5; i++) {
    await app.setPassword(app.password);
    const pendingLogin = app.request("login", { password: app.password });
    await app.setPassword("senha substituta longa para concorrencia");
    const response = await pendingLogin;
    if (response.status === 200) {
      expect(
        (await app.request("session", undefined, app.cookie(response))).status,
      ).toBe(401);
    } else expect(response.status).toBe(401);
  }
});
