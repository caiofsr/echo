import { expect, test } from "@playwright/test";

const password = "senha pessoal de teste no navegador";

test("cadastra e edita Clientes e Projetos com persistência entre sessões", async ({
  page,
  request,
  browser,
}, testInfo) => {
  expect(
    (await request.post("http://127.0.0.1:4319/reset-directory")).status(),
  ).toBe(204);
  await request.post("http://127.0.0.1:4319/reset-rate-limit");
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clientes");
  await expect(page.getByText("Nenhum cliente cadastrado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Novo projeto", exact: true }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Nome de exibição")).toBeFocused();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    dialog.getByText("Informe o nome de exibição do cliente."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Nome de exibição")).toBeFocused();
  await dialog.getByLabel("Nome de exibição").fill("Oficina Exemplo");
  const saveRequest = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().includes("_serverFn"),
  );
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  const rpc = await saveRequest;
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Cliente salvo.");
  // The RPC must reject a replay without the browser's authentication cookie.
  const headers = { ...rpc.headers() };
  delete headers.cookie;
  const denied = await request.post(rpc.url(), {
    headers,
    data: rpc.postDataBuffer()!,
  });
  expect(await denied.text()).toContain("Sessão inválida");

  await page
    .getByRole("button", { name: "Editar cliente Oficina Exemplo" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nome legal do destinatário")
    .fill("Oficina Exemplo Ltda.");
  await dialog.getByLabel("Identificação fiscal").fill("12.345.678/0001-90");
  await dialog.getByLabel("Endereço").fill("Rua das Flores, 10\nRecife - PE");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByText("Informe o nome do projeto.")).toBeVisible();
  await expect(dialog.getByText("Escolha um cliente.")).toBeVisible();
  await expect(dialog.getByLabel("Nome do projeto")).toBeFocused();
  await expect(
    dialog.getByText("Ex.: 120,35. Você também pode usar ponto decimal."),
  ).toBeVisible();
  await dialog.getByLabel("Nome do projeto").fill("Site institucional");
  await dialog
    .getByLabel("Cliente", { exact: false })
    .selectOption({ label: "Oficina Exemplo" });
  await dialog.getByLabel("Valor de hora").fill("-2");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    dialog.getByText(
      "Informe um valor de hora não negativo com até duas casas decimais.",
    ),
  ).toBeVisible();
  await expect(dialog.getByLabel("Valor de hora")).toBeFocused();
  await expect(dialog.getByLabel("Valor de hora")).toHaveAttribute(
    "aria-describedby",
    "project-rate-hint project-rate-error",
  );
  await dialog.getByLabel("Valor de hora").fill("120,35");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const projects = page.getByRole("list", { name: "Projetos cadastrados" });
  await expect(projects.getByText(/120,35/)).toBeVisible();
  await expect(
    projects.getByText("Oficina Exemplo", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome de exibição").fill("Segundo cliente");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Editar projeto Site institucional" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome do projeto").fill("Aplicativo");
  await dialog
    .getByLabel("Cliente", { exact: false })
    .selectOption({ label: "Segundo cliente" });
  await dialog.getByLabel("Valor de hora").fill("75.29");
  await dialog.getByLabel("Moeda de origem").selectOption("USD");
  await page.screenshot({
    path: testInfo.outputPath("project-dialog.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    projects.getByRole("heading", { name: "Aplicativo" }),
  ).toBeVisible();
  await expect(projects.getByText("Segundo cliente")).toBeVisible();
  await expect(projects.getByText(/75,29/)).toBeVisible();
  await expect(projects.getByText(/USD/)).toBeVisible();
  await page
    .getByRole("button", { name: "Editar cliente Oficina Exemplo" })
    .click();
  await expect(page.getByLabel("Nome legal do destinatário")).toHaveValue(
    "Oficina Exemplo Ltda.",
  );
  await expect(page.getByLabel("Identificação fiscal")).toHaveValue(
    "12.345.678/0001-90",
  );
  await expect(page.getByLabel("Endereço")).toHaveValue(
    "Rua das Flores, 10\nRecife - PE",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();

  const secondSession = await browser.newContext();
  try {
    const otherPage = await secondSession.newPage();
    await otherPage.goto("http://localhost:4318/clients");
    await otherPage.getByLabel("Senha pessoal").fill(password);
    await otherPage
      .getByRole("button", { name: "Entrar", exact: true })
      .click();
    await expect(
      otherPage.getByRole("heading", { name: "Aplicativo", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Editar projeto Aplicativo" })
      .click();
    await page.getByLabel("Nome do projeto").fill("Meu projeto revisado");
    await otherPage
      .getByRole("button", { name: "Editar projeto Aplicativo" })
      .click();
    await otherPage.getByLabel("Valor de hora").fill("80.50");
    await otherPage
      .getByRole("button", { name: "Salvar", exact: true })
      .click();
    await expect(otherPage.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "alterado em outra sessão",
    );
    await expect(page.getByLabel("Nome do projeto")).toHaveValue(
      "Meu projeto revisado",
    );
    await page.getByRole("button", { name: "Atualizar dados" }).click();
    await expect(page.getByRole("dialog").getByRole("status")).toContainText(
      "Dados atualizados",
    );
    await expect(page.getByLabel("Nome do projeto")).toHaveValue(
      "Meu projeto revisado",
    );
    await expect(page.getByLabel("Valor de hora")).toHaveValue("80,50");
    await page.getByLabel("Nome do projeto").fill("Aplicativo");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editar projeto Aplicativo" }),
    ).toBeFocused();
  } finally {
    await secondSession.close();
  }
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await expect(
    page.getByRole("button", { name: "Novo projeto", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("directory.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Novo projeto", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Editar projeto Aplicativo" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Valor de hora")).toHaveValue("80,50");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
