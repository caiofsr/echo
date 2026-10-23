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
  await page.goto("/horas");
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
  await second.goto("/faturas");
  await expect(second.getByRole("heading", { level: 1 })).toHaveText("Faturas");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await expect(second).toHaveURL(/\/entrar/);
  await page.goto("/cadastros");
  await expect(page).toHaveURL(/\/entrar/);
});
test("navegação responsiva sem dados fictícios e sem redirecionamento externo", async ({
  page,
}) => {
  await page.goto("/entrar?destino=https://example.com");
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
  await page.goto("/horas");
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
  await expect(page).toHaveURL("/horas");
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
  await page.goto("/entrar");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    /Muitas tentativas\. Tente novamente em \d+ segundos\./,
  );
});
