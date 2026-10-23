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
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(
      page.getByText("Este espaço está sendo preparado"),
    ).toBeVisible();
  }
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
        url.searchParams.get("disableRefresh") === String(refreshDisabled)
      );
    });
  const reconnect = sessionRead(true);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await reconnect;
  const passive = sessionRead(true);
  await page.clock.fastForward(61_000);
  await passive;
  const active = sessionRead(false);
  await page.getByRole("heading", { level: 1 }).click();
  await active;
});
