import { test, expect } from "@playwright/test";

const password = "senha pessoal de teste no navegador";
test.beforeEach(async ({ request }) => {
  const response = await request.post("http://127.0.0.1:4319/reset-rate-limit");
  expect(response.status()).toBe(204);
});
test("acesso protegido, destino interno, sessão após recarga e saída em todas as abas", async ({
  page,
  context,
}) => {
  await page.goto("/hours");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Seu trabalho, no seu ritmo.",
  );
  await page.getByLabel("Senha pessoal").fill("senha errada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Senha incorreta");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.getByLabel("Senha pessoal")).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Horas");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Horas");
  const second = await context.newPage();
  await second.goto("/invoices");
  await expect(second.getByRole("heading", { level: 1 })).toHaveText("Faturas");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(second).toHaveURL(/\/login/);
  await page.goto("/directory");
  await expect(page).toHaveURL(/\/login/);
});
test("navegação responsiva sem dados fictícios e sem redirecionamento externo", async ({
  page,
}) => {
  await page.goto("/login?destination=https://example.com");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/");
  for (const title of [
    "Horas",
    "Faturas",
    "Cadastros",
    "Configurações",
    "Quadro",
  ]) {
    const link = page.getByRole("link", { name: title, exact: true });
    await link.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.locator("nav .selected")).toHaveCount(
      title === "Configurações" ? 0 : 1,
    );
    await expect(
      page.getByText("Este espaço está sendo preparado"),
    ).toBeVisible();
  }
  await page.goto("/hours?filter=test");
  await expect(
    page.getByRole("link", { name: "Horas", exact: true }),
  ).toHaveClass(/selected/);
  await expect(
    page.getByRole("link", { name: "Quadro", exact: true }),
  ).not.toHaveAttribute("aria-current", "page");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("sessão revogada pede reentrada na mesma página sem recarregar", async ({
  page,
  request,
}) => {
  await page.clock.install();
  await page.goto("/hours");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Horas");
  await request.post("http://127.0.0.1:4319/reset-password");
  await page.clock.fastForward(61_000);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Entre novamente",
  );
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Horas");
  await expect(page).toHaveURL("/hours");
});

test("limite nativo informa a espera em português", async ({
  page,
  request,
}) => {
  for (let i = 0; i < 5; i++) {
    const response = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://localhost:4318" },
      data: { email: "owner@echo.invalid", password: "errada" },
    });
    expect(response.status()).toBe(401);
  }
  await page.goto("/login");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    /Muitas tentativas\. Tente novamente em \d+ segundos\./,
  );
});

test("o handler nativo interpreta JSON e formulário sem expor outra identidade", async ({
  request,
}) => {
  const headers = { Origin: "http://localhost:4318" };
  const malformed = await request.post("/api/auth/sign-in/email", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: "{",
  });
  expect(malformed.status()).toBe(400);
  const invalid = await request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: "owner@echo.invalid", password: 123 },
  });
  expect(invalid.status()).toBe(400);
  const otherIdentity = await request.post("/api/auth/sign-in/email", {
    headers,
    form: { email: "other@example.com", password },
  });
  expect(otherIdentity.status()).toBe(401);
  const login = await request.post("/api/auth/sign-in/email", {
    headers,
    form: { email: "owner@echo.invalid", password },
  });
  expect(login.status()).toBe(200);
});

test("observação nativa e consultas periódicas não renovam; atividade visível renova", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/hours");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Horas");
  const sessionRead = (refreshDisabled: boolean) =>
    page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/auth/get-session" &&
        url.searchParams.get("disableRefresh") ===
          (refreshDisabled ? "true" : null)
      );
    });
  const reconnect = sessionRead(true);
  const reconnected = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/auth/get-session" &&
      url.searchParams.get("disableRefresh") === "true"
    );
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await reconnect;
  await (await reconnected).finished();
  const passive = sessionRead(true);
  await page.clock.fastForward(61_000);
  await passive;
  const before = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  const active = sessionRead(false);
  const renewed = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/auth/get-session" &&
      !url.searchParams.has("disableRefresh")
    );
  });
  await page.getByRole("heading", { level: 1 }).click();
  await active;
  const after = await (await renewed).json();
  expect(Date.parse(after.session.expiresAt)).toBeGreaterThan(
    Date.parse(before.session.expiresAt),
  );
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    }),
  );
  const background = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/auth/get-session" &&
      url.searchParams.get("disableRefresh") === "true"
    );
  });
  await page.clock.fastForward(61_000);
  const observed = await (await background).json();
  expect(observed.session.expiresAt).toBe(after.session.expiresAt);
});

test("rascunho e confirmação entre abas sobrevivem à expiração e à reentrada", async ({
  page,
  context,
  request,
}) => {
  await page.clock.install();
  await page.goto("/login");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/__tests__/session.html");
  await page.getByLabel("Rascunho").fill("Trabalho ainda não salvo");
  const other = await context.newPage();
  await other.goto("/__tests__/session.html");
  await expect(other.getByLabel("Rascunho")).toBeVisible();
  await request.post("http://127.0.0.1:4319/reset-password");
  await other.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    other.getByRole("heading", { name: "Entre novamente" }),
  ).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(
    page.getByRole("heading", { name: "Entre novamente" }),
  ).toBeVisible();
  await expect(page.getByLabel("Rascunho")).toHaveValue(
    "Trabalho ainda não salvo",
  );
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Rascunho")).toBeVisible();
  await expect(page.getByLabel("Rascunho")).toHaveValue(
    "Trabalho ainda não salvo",
  );
  await other.getByLabel("Senha pessoal").fill(password);
  await other.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(other.getByLabel("Rascunho")).toBeVisible();
  const confirmation = other.waitForEvent("dialog");
  const click = other.getByRole("button", { name: "Sair" }).click();
  const dialog = await confirmation;
  expect(dialog.message()).toContain("alterações não salvas em todas as abas");
  await dialog.dismiss();
  await click;
  await expect(other).toHaveURL("/__tests__/session.html");
  await expect(page.getByLabel("Rascunho")).toHaveValue(
    "Trabalho ainda não salvo",
  );
});

test("página restaurada anuncia seus rascunhos e desmontar remove a participação antiga", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/__tests__/session.html");
  const other = await context.newPage();
  await other.goto("/__tests__/session.html");
  await other.getByLabel("Rascunho").fill("Rascunho restaurado");
  await other.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  await expect(other.getByLabel("Rascunho")).toBeVisible();
  const confirmation = page.waitForEvent("dialog");
  const click = page.getByRole("button", { name: "Sair" }).click();
  const dialog = await confirmation;
  await dialog.dismiss();
  await click;
  await expect(page).toHaveURL("/__tests__/session.html");
  await other.getByRole("button", { name: "Desmontar formulário" }).click();
  await other
    .getByRole("button", { name: "Montar formulário", exact: true })
    .click();
  await expect(other.getByLabel("Rascunho")).toHaveValue("");
  let unexpectedConfirmation = false;
  page.on("dialog", async (event) => {
    unexpectedConfirmation = true;
    await event.dismiss();
  });
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(other).toHaveURL(/\/login/);
  expect(unexpectedConfirmation).toBe(false);
});

test("beforeLoad usa a sessão atual no SSR e na navegação após revogação", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/login?destination=/invoices");
  await expect(page).toHaveURL("/invoices");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Faturas");
  await request.post("http://127.0.0.1:4319/reset-password");
  await page.getByRole("link", { name: "Cadastros", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?destination=%2Fdirectory/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Seu trabalho, no seu ritmo.",
  );
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/directory");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cadastros");
});
