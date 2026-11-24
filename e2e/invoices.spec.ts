import { expect, test } from "@playwright/test";

const control = "http://127.0.0.1:4319";

test("confere inclusões, exclusões e valores da prévia sem emitir a fatura", async ({
  page,
  request,
}) => {
  expect((await request.post(`${control}/seed-invoices`)).status()).toBe(204);
  await page.goto("/invoices");
  await page
    .getByLabel("Senha pessoal")
    .fill("senha pessoal de teste no navegador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Faturas");
  const timer = page.getByLabel("Cronômetro global");
  await expect(timer).toContainText("Sessão em andamento");

  const form = page.locator("form.invoice-form");
  await form.getByRole("combobox", { name: "Cliente", exact: true }).click();
  await page.getByRole("option", { name: "Oficina Aurora" }).click();
  await form.getByLabel("De", { exact: true }).fill("2020-04-01");
  await form.getByLabel("Até", { exact: true }).fill("2020-04-30");
  await form
    .getByRole("combobox", { name: "Dados de pagamento", exact: true })
    .click();
  await page.getByRole("option", { name: "Pix" }).click();
  await expect(form.getByText("Pix para fatura@aurora.test")).toBeVisible();

  // Two projects with different currencies need a single positive quote.
  await form.getByRole("button", { name: "Conferir prévia" }).click();
  await expect(form.getByRole("alert")).toContainText("cotação positiva");
  await form.getByLabel("Cotação", { exact: false }).fill("5,20");
  await form.getByRole("button", { name: "Conferir prévia" }).click();

  const preview = page.getByRole("region", { name: "Prévia", exact: true });
  await expect(preview).toContainText(
    "Nenhum número reservado e nenhuma hora bloqueada",
  );
  await expect(preview).toContainText("1 USD = 5,20 BRL");
  await expect(preview).toContainText("emitida por Ateliê Aurora");
  await expect(preview.getByRole("heading", { name: "Website" })).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: "Identidade" }),
  ).toBeVisible();

  const website = preview
    .locator(".invoice-line")
    .filter({ hasText: "Website" });
  await expect(website).toContainText("01:00:00");
  await expect(website).toContainText("US$ 60,00 por hora");
  await expect(website).toContainText("R$ 312,00");
  const identity = preview
    .locator(".invoice-line")
    .filter({ hasText: "Identidade" });
  await expect(identity).toContainText("R$ 100,00 por hora");
  await expect(identity).toContainText("R$ 100,00");

  const description = identity.getByLabel("Descrição do serviço");
  await expect(description).toHaveValue("Identidade");
  await description.fill("Identidade visual completa");
  await expect(preview.locator(".invoice-total")).toContainText("R$ 412,00");

  const exclusions = page.getByRole("region", { name: /Excluídos/ });
  await expect(exclusions).toContainText("Contagem em andamento");
  await expect(exclusions).toContainText("Sem projeto. Vincule");
  await expect(exclusions).toContainText("Já incluído em uma fatura válida");
  await expect(
    exclusions.getByText(
      "Fora dos limites completos do período. Ajuste as datas para incluir o registro inteiro.",
    ),
  ).toHaveCount(2);
  await expect(exclusions.locator("li")).toHaveCount(5);

  await form.getByRole("combobox", { name: "Idioma", exact: true }).click();
  await page.getByRole("option", { name: "English" }).click();
  await form.getByRole("button", { name: "Conferir prévia" }).click();
  await expect(preview).toContainText("Idioma: English");

  // Switching the invoice currency converts each project with the same quote
  // and rounds each line before summing it.
  await form
    .getByRole("combobox", { name: "Moeda da fatura", exact: true })
    .click();
  await page.getByRole("option", { name: "Dólar (USD)" }).click();
  await expect(
    form.getByRole("button", { name: "Conferir prévia" }),
  ).toBeVisible();
  await form.getByRole("button", { name: "Conferir prévia" }).click();
  await expect(
    page.getByRole("region", { name: "Prévia" }).locator(".invoice-total"),
  ).toContainText("US$ 79,23");
  await expect(
    page
      .getByRole("region", { name: "Prévia" })
      .locator(".invoice-line")
      .filter({ hasText: "Identidade" })
      .getByLabel("Descrição do serviço"),
  ).toHaveValue("Identidade visual completa");

  // The preview leaves the cronômetro and the emitted invoice untouched.
  await expect(timer).toContainText("Sessão em andamento");
});
