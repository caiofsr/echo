import { expect, test } from "@playwright/test";

const password = "senha pessoal de teste no navegador";

test("edição em modal preserva o rascunho e oculta os dados durante a reautenticação", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:4319/reset-settings");
  await request.post("http://127.0.0.1:4319/reset-rate-limit");
  await page.clock.install();
  await page.goto("/settings");
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar empresa" }).click();
  await page.getByLabel("Nome ou razão social").fill("Empresa inicial");
  await page.getByRole("button", { name: "Salvar empresa" }).click();
  await page
    .getByRole("button", { name: "Editar empresa Empresa inicial" })
    .click();
  await page.getByLabel("Nome ou razão social").fill("Rascunho privado");
  await request.post("http://127.0.0.1:4319/reset-password");
  await page.clock.fastForward(61_000);
  await expect(
    page.getByRole("heading", { name: "Entre novamente" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Editar empresa" }),
  ).not.toBeVisible();
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Editar empresa" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome ou razão social")).toHaveValue(
    "Rascunho privado",
  );
});

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
  await expect(
    page.getByText("Nenhuma forma de recebimento ativa"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Adicionar empresa" }).click();
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
  const saveRequest = page.waitForRequest(
    (outgoing) =>
      outgoing.method() === "POST" &&
      outgoing.resourceType() === "fetch" &&
      !new URL(outgoing.url()).pathname.startsWith("/api/auth/"),
  );
  await companyForm.getByRole("button", { name: "Salvar empresa" }).click();
  const rpc = await saveRequest;
  await expect(
    page.getByRole("button", { name: "Editar empresa Oficina Exemplo Ltda." }),
  ).toBeFocused();
  const headers = await rpc.allHeaders();
  delete headers.cookie;
  delete headers.host;
  delete headers["content-length"];
  const unauthorized = await request.fetch(rpc.url(), {
    method: "POST",
    headers,
    data: rpc.postData() ?? undefined,
  });
  // TanStack serializes server-function errors in an HTTP 200 response.
  expect(await unauthorized.text()).toContain("Sessão inválida.");
  expect(unauthorized.headers()["cache-control"]).toContain("no-store");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Oficina Exemplo Ltda." }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Adicionar empresa" }).click();
  await expect(companyForm.getByLabel("Nome ou razão social")).toHaveValue("");
  await companyForm.getByLabel("Nome ou razão social").fill("Outra empresa");
  await companyForm.getByRole("button", { name: "Salvar empresa" }).click();
  await expect(
    page.getByRole("button", { name: "Editar empresa Outra empresa" }),
  ).toBeFocused();

  await page
    .getByRole("button", { name: "Adicionar forma de recebimento" })
    .click();
  const transferForm = page.getByRole("form", {
    name: "Nova forma de recebimento",
  });
  await expect(transferForm.getByLabel("Rótulo")).toBeFocused();
  await transferForm.getByRole("button", { name: "Cancelar" }).click();
  await expect(
    page.getByRole("button", { name: "Adicionar forma de recebimento" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Adicionar forma de recebimento" })
    .click();
  await transferForm.getByLabel("Rótulo").fill("   ");
  await transferForm.getByLabel("Instruções de recebimento").fill("   ");
  await transferForm
    .getByRole("button", { name: "Salvar forma de recebimento" })
    .click();
  await expect(transferForm.getByText("Informe um rótulo.")).toBeVisible();
  await expect(transferForm.getByLabel("Rótulo")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(transferForm.getByLabel("Rótulo")).toHaveAccessibleDescription(
    "Informe um rótulo.",
  );
  await expect(
    transferForm.getByText("Informe as instruções de recebimento."),
  ).toBeVisible();
  await expect(
    transferForm.getByLabel("Instruções de recebimento"),
  ).toHaveAccessibleDescription("Informe as instruções de recebimento.");
  await transferForm.getByLabel("Rótulo").fill("Transferência");
  await transferForm
    .getByLabel("Instruções de recebimento")
    .fill("Banco 000 · Agência 123 · Conta 456");
  await transferForm
    .getByRole("button", { name: "Salvar forma de recebimento" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transferência" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar Transferência" }),
  ).toBeFocused();
  await expect(
    page
      .getByRole("region", { name: "Formas de recebimento" })
      .getByRole("status"),
  ).toHaveText("Forma de recebimento salva.");

  await page
    .getByRole("button", { name: "Adicionar forma de recebimento" })
    .click();
  const pixForm = page.getByRole("form", {
    name: "Nova forma de recebimento",
  });
  await expect(
    page.getByRole("button", { name: "Editar Transferência" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Arquivar Transferência" }),
  ).toBeDisabled();
  await pixForm.getByLabel("Rótulo").fill("PIX");
  await pixForm
    .getByLabel("Instruções de recebimento")
    .fill("Chave de recebimento: exemplo@example.invalid");
  await pixForm
    .getByRole("button", { name: "Salvar forma de recebimento" })
    .click();
  await expect(page.getByRole("heading", { name: "PIX" })).toBeVisible();

  await page.getByRole("button", { name: "Editar PIX" }).click();
  const editForm = page.getByRole("form", { name: "Editar PIX" });
  const paymentDialog = page.getByRole("dialog", {
    name: "Editar forma de recebimento",
  });
  await expect(paymentDialog).toBeVisible();
  await expect(editForm.getByLabel("Rótulo")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    editForm.getByRole("button", { name: "Cancelar" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(editForm.getByLabel("Rótulo")).toBeFocused();
  await expect(
    page
      .locator("button")
      .filter({ hasText: "Adicionar forma de recebimento" }),
  ).toBeDisabled();
  await expect(
    page.locator('button[aria-label="Editar Transferência"]'),
  ).toBeDisabled();
  await editForm.getByLabel("Rótulo").fill("Alteração não salva");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(paymentDialog).toBeVisible();
  await expect(editForm.getByLabel("Rótulo")).toHaveValue(
    "Alteração não salva",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await editForm.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("button", { name: "Editar PIX" })).toBeFocused();
  await page.getByRole("button", { name: "Editar PIX" }).click();
  await editForm
    .getByLabel("Instruções de recebimento")
    .fill("Chave atualizada");
  await editForm
    .getByRole("button", { name: "Salvar forma de recebimento" })
    .click();
  await expect(page.getByText("Chave atualizada")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar PIX" })).toBeFocused();
  await expect(
    page
      .getByRole("region", { name: "Formas de recebimento" })
      .getByRole("status"),
  ).toHaveText("Forma de recebimento salva.");

  await page.getByRole("button", { name: "Arquivar PIX" }).click();
  await expect(page.getByText("Arquivadas (1)")).toBeFocused();
  await expect(page.getByRole("button", { name: "Editar PIX" })).toHaveCount(0);
  await page.reload();
  await page.getByText("Arquivadas (1)").click();
  await expect(page.getByText("Chave atualizada")).toBeVisible();
  await page.getByRole("button", { name: "Restaurar PIX" }).click();
  await expect(page.getByRole("button", { name: "Editar PIX" })).toBeFocused();
  await expect(
    page
      .getByRole("region", { name: "Formas de recebimento" })
      .getByRole("status"),
  ).toHaveText("Forma de recebimento restaurada.");

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Editar empresa Outra empresa" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar empresa Oficina Exemplo Ltda." })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Editar empresa" }),
  ).toBeVisible();
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
  await page.getByLabel("Telefone").fill("+55 81 98888-0000");
  await page.getByRole("button", { name: "Salvar empresa" }).click();
  await expect(
    page.getByRole("button", { name: "Editar empresa Oficina Exemplo Ltda." }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Editar empresa Oficina Exemplo Ltda." })
    .click();
  await expect(page.getByLabel("Telefone")).toHaveValue("+55 81 98888-0000");
  if (process.env.ECHO_CAPTURE_SETTINGS)
    await page.screenshot({ path: testInfo.outputPath("settings.png") });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Editar empresa Oficina Exemplo Ltda." }),
  ).toBeFocused();
  await expect(
    page.getByText("Banco 000 · Agência 123 · Conta 456"),
  ).toBeVisible();
  await expect(page.getByText("Chave atualizada")).toBeVisible();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skipLink).not.toBeInViewport();
  await skipLink.focus();
  await expect(skipLink).toBeInViewport();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  if (process.env.ECHO_CAPTURE_SETTINGS)
    await page.getByRole("region", { name: "Empresas" }).screenshot({
      path: testInfo.outputPath("companies.png"),
    });
  await page.setViewportSize({ width: 320, height: 844 });
  const companyRow = page
    .locator(".company-row")
    .filter({ has: page.getByRole("heading", { name: "Outra empresa" }) });
  const layout = await companyRow.evaluate((row) => {
    const title = row.querySelector("h3")!.getBoundingClientRect();
    const button = row.querySelector("button")!.getBoundingClientRect();
    return {
      titleTop: title.top,
      titleBottom: title.bottom,
      buttonTop: button.top,
      buttonBottom: button.bottom,
      width: button.width,
      height: button.height,
    };
  });
  expect(layout.width).toBeGreaterThanOrEqual(44);
  expect(layout.height).toBeGreaterThanOrEqual(44);
  expect(layout.titleTop).toBeLessThan(layout.buttonBottom);
  expect(layout.titleBottom).toBeGreaterThan(layout.buttonTop);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
