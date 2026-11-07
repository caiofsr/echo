import { expect, test } from "@playwright/test";

const password = "senha pessoal de teste no navegador";

test("organiza tarefas e colunas no quadro com persistência no servidor", async ({
  page,
  request,
  browser,
}, testInfo) => {
  const isMobileProject = testInfo.project.name === "mobile";
  expect(
    (await request.post("http://127.0.0.1:4319/reset-board")).status(),
  ).toBe(204);
  expect(
    (await request.post("http://127.0.0.1:4319/reset-directory")).status(),
  ).toBe(204);
  await request.post("http://127.0.0.1:4319/reset-rate-limit");

  // O Quadro é a tela inicial e pede a senha pessoal antes de mostrar tarefas.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Senha pessoal").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quadro");
  await expect(page.getByText("Nenhuma coluna no quadro")).toBeVisible();

  // Cadastro de um Projeto que será vinculado a uma Tarefa.
  await page.getByRole("link", { name: "Clientes" }).click();
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome de exibição").fill("Oficina Exemplo");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome do projeto").fill("Site institucional");
  await dialog
    .getByLabel("Cliente", { exact: false })
    .selectOption({ label: "Oficina Exemplo" });
  await dialog.getByLabel("Valor de hora").fill("100,00");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  await page.getByRole("link", { name: "Quadro" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quadro");
  const columns = page.locator(".board-column");

  // Criar a primeira Coluna, com validação de nome vazio.
  await page.getByRole("button", { name: "Nova coluna", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByText("Informe o nome da coluna.")).toBeVisible();
  await expect(dialog.getByLabel("Nome da coluna")).toBeFocused();
  await dialog.getByLabel("Nome da coluna").fill("A fazer");
  const columnRpc = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().includes("_serverFn"),
  );
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  const rpc = await columnRpc;
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Coluna salva.");
  // A operação de servidor deve rejeitar a repetição sem a cookie da sessão.
  const headers = { ...rpc.headers() };
  delete headers.cookie;
  const denied = await request.post(rpc.url(), {
    headers,
    data: rpc.postDataBuffer()!,
  });
  expect(await denied.text()).toContain("Sessão inválida");

  await expect(
    columns.nth(0).getByRole("heading", { name: "A fazer" }),
  ).toBeVisible();
  await expect(columns.nth(0).getByText("Sem tarefas.")).toBeVisible();

  // Criar e editar Tarefas com título, descrição e Projeto opcionais.
  await columns.nth(0).getByRole("button", { name: "+ Tarefa" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByText("Informe o título da tarefa.")).toBeVisible();
  await expect(dialog.getByLabel("Título")).toBeFocused();
  await dialog.getByLabel("Título").fill("Revisar proposta");
  await dialog.getByLabel("Descrição").fill("Sumário e valores");
  await dialog.getByRole("combobox", { name: "Projeto" }).click();
  await page.getByRole("option", { name: "Site institucional" }).click();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Tarefa salva.");

  const firstTask = page.locator("[data-task-card]");
  await expect(firstTask.getByText("Revisar proposta")).toBeVisible();
  await expect(firstTask.getByText("Sumário e valores")).toBeVisible();
  await expect(
    firstTask.getByRole("button", { name: "Revisar proposta", exact: true }),
  ).toBeVisible();
  await expect(
    firstTask.getByRole("button", { name: /Mover tarefa/ }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Nova coluna", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da coluna").fill("Fazendo");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  if (isMobileProject) {
    // No celular a coluna nova fica oculta até ser escolhida.
    await expect(columns).toHaveCount(2);
    await expect(columns.nth(1)).toBeHidden();
  } else {
    await expect(
      columns.nth(1).getByRole("heading", { name: "Fazendo" }),
    ).toBeVisible();
  }

  // O quadro persiste entre recarregamentos.
  await page.reload();
  await expect(
    columns.nth(0).getByRole("heading", { name: "A fazer" }),
  ).toBeVisible();
  await expect(page.getByText("Revisar proposta")).toBeVisible();

  // Gerenciar colunas em lista compacta: renomear, ordenar e ocupação bloqueia.
  await page
    .getByRole("button", { name: "Gerenciar colunas", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  const renamedInput = dialog.getByLabel("Nome da coluna A fazer");
  await renamedInput.fill("Primeiro quadro");
  await renamedInput.blur();
  await expect(
    dialog.getByRole("button", { name: "Remover coluna Primeiro quadro" }),
  ).toBeDisabled();
  await expect(dialog.getByText("1 tarefa")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Mover coluna Primeiro quadro para baixo" })
    .click();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Colunas reordenadas.");
  if (isMobileProject) {
    await expect(columns.nth(1)).toBeHidden();
    await expect(
      columns.nth(0).getByRole("heading", { name: "Fazendo" }),
    ).toBeVisible();
  } else {
    await expect(
      columns.nth(1).getByRole("heading", { name: "Primeiro quadro" }),
    ).toBeVisible();
    await expect(
      columns.nth(0).getByRole("heading", { name: "Fazendo" }),
    ).toBeVisible();
    const boardBounds = await page.locator(".board-columns").boundingBox();
    const firstColumnBounds = await columns.nth(0).boundingBox();
    const secondColumnBounds = await columns.nth(1).boundingBox();
    expect(boardBounds).not.toBeNull();
    expect(firstColumnBounds).not.toBeNull();
    expect(secondColumnBounds).not.toBeNull();
    expect(
      Math.abs(firstColumnBounds!.width - secondColumnBounds!.width),
    ).toBeLessThan(2);
    expect(secondColumnBounds!.x + secondColumnBounds!.width).toBeCloseTo(
      boardBounds!.x + boardBounds!.width,
      0,
    );
  }

  // Abrir os detalhes, sem campos editáveis, e mover a Tarefa por ali.
  if (isMobileProject) {
    await page
      .getByRole("group", { name: "Coluna visível no celular" })
      .getByRole("button", { name: "Primeiro quadro" })
      .click();
  }
  await firstTask.getByRole("button", { name: "Revisar proposta" }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Revisar proposta" }),
  ).toBeVisible();
  await expect(dialog.getByText("Sumário e valores")).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Mover", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Coluna" }).click();
  await page.getByRole("option", { name: "Fazendo" }).click();
  await dialog.getByRole("combobox", { name: "Posição" }).click();
  await page.getByRole("option", { name: "Primeira" }).click();
  await dialog.getByRole("button", { name: "Mover", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Tarefa movida.");
  if (isMobileProject) {
    // A Tarefa foi para "Fazendo"; no celular mude para essa coluna para vê-la.
    await page
      .getByRole("group", { name: "Coluna visível no celular" })
      .getByRole("button", { name: "Fazendo" })
      .click();
    await expect(columns.nth(1)).toBeHidden();
    await expect(columns.nth(0)).toBeVisible();
  } else {
    await expect(columns.nth(1).getByText("Sem tarefas.")).toBeVisible();
  }
  await expect(columns.nth(0).getByText("Revisar proposta")).toBeVisible();

  // Editar a Tarefa no lugar.
  await page
    .getByRole("button", { name: "Revisar proposta", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Editar tarefa" }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Título")).toHaveValue("Revisar proposta");
  await expect(dialog.getByLabel("Descrição")).toHaveValue("Sumário e valores");
  await dialog.getByLabel("Título").fill("Revisar proposta final");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // Arraste da Tarefa para outra coluna pelo mouse, no computador.
  if (!isMobileProject) {
    const draggedCard = columns.nth(0).locator("[data-task-card]");
    const targetColumn = columns.nth(1);
    await draggedCard.scrollIntoViewIfNeeded();
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await draggedCard.dispatchEvent("dragstart", { dataTransfer: transfer });
    const box = await targetColumn.boundingBox();
    await targetColumn.dispatchEvent("dragover", {
      dataTransfer: transfer,
      clientX: box!.x + box!.width / 2,
      clientY: box!.y + 12,
    });
    await targetColumn.dispatchEvent("drop", { dataTransfer: transfer });
    await expect(page.getByRole("status")).toHaveText("Tarefa movida.");
    await expect(columns.nth(0).getByText("Sem tarefas.")).toBeVisible();
    await expect(
      columns.nth(1).getByText("Revisar proposta final"),
    ).toBeVisible();
  }

  // Coluna vazia pode ser removida; ocupada exige mover as Tarefas antes.
  await page.getByRole("button", { name: "Nova coluna", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da coluna").fill("Encerradas");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Gerenciar colunas", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Remover coluna Encerradas" })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Remover coluna Encerradas" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", {
      name: isMobileProject
        ? /Remover coluna Fazendo/
        : /Remover coluna Primeiro quadro/,
    }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Coluna removida.");

  // Outra sessão do usuário vê o mesmo quadro.
  const secondSession = await browser.newContext();
  try {
    const otherPage = await secondSession.newPage();
    await otherPage.goto("http://localhost:4318/");
    await otherPage.getByLabel("Senha pessoal").fill(password);
    await otherPage
      .getByRole("button", { name: "Entrar", exact: true })
      .click();
    await expect(otherPage.getByRole("heading", { level: 1 })).toHaveText(
      "Quadro",
    );
    await expect(otherPage.getByText("Revisar proposta final")).toBeVisible();
    await expect(otherPage.getByText("Oficina Exemplo")).toHaveCount(0);
  } finally {
    await secondSession.close();
  }

  // No celular, uma coluna por vez; em qualquer tela estreita, sem overflow.
  if (isMobileProject) {
    await page
      .getByRole("group", { name: "Coluna visível no celular" })
      .getByRole("button", { name: "Fazendo" })
      .click();
    await expect(columns.nth(0)).toBeVisible();
    await expect(columns.nth(1)).toBeHidden();
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("board.png"),
    fullPage: true,
  });
});
