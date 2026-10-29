import { expect, test } from "@playwright/test";

const password = "senha pessoal de teste no navegador";

test("configura empresa e vários conjuntos de pagamento com dados persistidos", async ({
  page,
  request,
}, testInfo) => {
  const reset = await request.post("http://127.0.0.1:4319/reset-settings");
  expect(reset.status()).toBe(204);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Configurações",
  );
  await expect(page.getByText("Nenhum conjunto cadastrado")).toBeVisible();

  const companyForm = page.locator("form.settings-form");
  await companyForm.getByLabel("Nome ou razão social").fill("   ");
  await companyForm.getByRole("button", { name: "Salvar empresa" }).click();
  await expect(
    companyForm.getByText("Informe o nome ou a razão social."),
  ).toBeVisible();
  await companyForm
    .getByLabel("Nome ou razão social")
    .fill("Oficina Exemplo Ltda.");
  await companyForm
    .getByLabel("Identificação fiscal")
    .fill("12.345.678/0001-90");
  await companyForm
    .getByLabel("Endereço")
    .fill("Rua das Flores, 10\nRecife - PE");
  await companyForm.getByLabel("Telefone").fill("+55 81 99999-0000");
  await companyForm.getByRole("button", { name: "Salvar empresa" }).click();
  await expect(page.getByRole("status")).toHaveText("Dados da empresa salvos.");

  await page.getByRole("button", { name: "Adicionar conjunto" }).click();
  const transferForm = page.getByRole("form", {
    name: "Novo conjunto de dados de pagamento",
  });
  await transferForm.getByLabel("Rótulo").fill("   ");
  await transferForm.getByLabel("Instruções de recebimento").fill("   ");
  await transferForm.getByRole("button", { name: "Salvar conjunto" }).click();
  await expect(transferForm.getByText("Informe um rótulo.")).toBeVisible();
  await expect(
    transferForm.getByText("Informe as instruções de recebimento."),
  ).toBeVisible();
  await transferForm.getByLabel("Rótulo").fill("Transferência");
  await transferForm
    .getByLabel("Instruções de recebimento")
    .fill("Banco 000 · Agência 123 · Conta 456");
  await transferForm.getByRole("button", { name: "Salvar conjunto" }).click();
  await expect(
    page.getByRole("heading", { name: "Transferência" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Adicionar conjunto" }).click();
  const pixForm = page.getByRole("form", {
    name: "Novo conjunto de dados de pagamento",
  });
  await pixForm.getByLabel("Rótulo").fill("PIX");
  await pixForm
    .getByLabel("Instruções de recebimento")
    .fill("Chave de recebimento: exemplo@example.invalid");
  await pixForm.getByRole("button", { name: "Salvar conjunto" }).click();
  await expect(page.getByRole("heading", { name: "PIX" })).toBeVisible();

  await page.getByRole("button", { name: "Editar PIX" }).click();
  const editForm = page.getByRole("form", { name: "Editar PIX" });
  await editForm
    .getByLabel("Instruções de recebimento")
    .fill("Chave atualizada");
  await editForm.getByRole("button", { name: "Salvar conjunto" }).click();
  await expect(page.getByText("Chave atualizada")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Nome ou razão social")).toHaveValue(
    "Oficina Exemplo Ltda.",
  );
  await expect(page.getByLabel("Identificação fiscal")).toHaveValue(
    "12.345.678/0001-90",
  );
  await expect(page.getByLabel("Endereço")).toHaveValue(
    "Rua das Flores, 10\nRecife - PE",
  );
  await expect(page.getByLabel("Telefone")).toHaveValue("+55 81 99999-0000");
  await expect(
    page.getByText("Banco 000 · Agência 123 · Conta 456"),
  ).toBeVisible();
  await expect(page.getByText("Chave atualizada")).toBeVisible();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  if (process.env.ECHO_CAPTURE_SETTINGS)
    await page.screenshot({
      path: testInfo.outputPath("settings.png"),
      fullPage: true,
    });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
