import { expect, test } from "@playwright/test";

const control = `http://127.0.0.1:${process.env.ECHO_TEST_CONTROL_PORT ?? "4319"}`;

test("inicia, troca e retoma Tarefas preservando períodos e horas dos cards", async ({
  page,
  request,
}, testInfo) => {
  expect((await request.post(`${control}/reset-board`)).status()).toBe(204);
  expect((await request.post(`${control}/reset-directory`)).status()).toBe(204);
  expect((await request.post(`${control}/reset-rate-limit`)).status()).toBe(
    204,
  );
  await page.goto("/");
  await page
    .getByLabel("Senha pessoal")
    .fill("senha pessoal de teste no navegador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome de exibição").fill("Cliente do cronômetro");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await dialog.getByLabel("Nome do projeto").fill("Projeto do cronômetro");
  await dialog.getByLabel("Cliente", { exact: false }).selectOption({
    label: "Cliente do cronômetro",
  });
  await dialog.getByLabel("Valor de hora").fill("120");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Quadro", exact: true }).click();
  await page.getByRole("button", { name: "Nova coluna", exact: true }).click();
  await dialog.getByLabel("Nome da coluna").fill("Trabalho");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  for (const title of ["Primeira atividade", "Segunda atividade"]) {
    await page.getByRole("button", { name: "+ Tarefa", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título").fill(title);
    await dialog.getByLabel("Descrição").fill(`Descrição de ${title}`);
    if (title === "Segunda atividade") {
      await dialog.getByRole("combobox", { name: "Projeto" }).click();
      await page.getByRole("option", { name: "Projeto do cronômetro" }).click();
    }
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  const global = page.getByRole("region", { name: "Cronômetro global" });
  await page
    .getByRole("button", { name: "Iniciar Primeira atividade", exact: true })
    .click();
  await expect(global).toContainText("Primeira atividade");
  await expect(page.getByLabel("Horas de Primeira atividade")).not.toHaveText(
    "00:00:00",
    { timeout: 10000 },
  );
  await page
    .getByRole("button", { name: "Iniciar Segunda atividade", exact: true })
    .click();
  await expect(global).toContainText("Segunda atividade");
  await expect(global.getByLabel("Tempo em andamento")).not.toHaveText(
    "00:00:00",
  );
  await expect(
    page.getByRole("button", {
      name: "Iniciar Primeira atividade",
      exact: true,
    }),
  ).toBeEnabled();
  await global.getByRole("button", { name: "Parar", exact: true }).click();
  const resume = global.getByRole("button", {
    name: "Retomar último",
    exact: true,
  });
  await expect(resume).toBeVisible();
  await page.keyboard.press("Tab");
  await resume.focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "Segunda atividade · Projeto do cronômetro",
  );
  await resume.click();
  await expect(global).toContainText("Segunda atividade");
  await page.reload();
  await expect(global).toContainText("Segunda atividade");
  await expect(global.getByLabel("Tempo em andamento")).not.toHaveText(
    "00:00:00",
  );
  await page.screenshot({
    path: testInfo.outputPath("task-timer-board.png"),
    fullPage: true,
  });
  await global.getByRole("button", { name: "Parar", exact: true }).click();
  await expect(resume).toBeVisible();
  const accumulated = await page
    .getByLabel("Horas de Segunda atividade")
    .innerText();
  await page.getByRole("link", { name: "Horas", exact: true }).click();
  await expect(page.locator(".hours-record")).toHaveCount(3);
  await expect(page.locator(".hours-record").nth(2)).toContainText(
    "Descrição de Primeira atividade",
  );
  await expect(page.locator(".hours-record").first()).toContainText(
    "Descrição de Segunda atividade",
  );
  const periods = await page
    .locator(".hours-record")
    .filter({ has: page.getByText(/· Segunda atividade$/) })
    .locator(".hours-duration")
    .allTextContents();
  expect(periods).toHaveLength(2);
  const seconds = (value: string) =>
    value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  expect(periods.map(seconds).every((value) => value > 0)).toBe(true);
  expect(seconds(accumulated)).toBe(seconds(periods[0]) + seconds(periods[1]));
});

test("exclui Tarefa ativa em duas confirmações e preserva o período encerrado", async ({
  page,
  request,
}) => {
  expect((await request.post(`${control}/reset-board`)).status()).toBe(204);
  expect((await request.post(`${control}/reset-directory`)).status()).toBe(204);
  expect((await request.post(`${control}/reset-rate-limit`)).status()).toBe(
    204,
  );
  await page.goto("/");
  await page
    .getByLabel("Senha pessoal")
    .fill("senha pessoal de teste no navegador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("button", { name: "Nova coluna", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da coluna").fill("Fazendo");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "+ Tarefa" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Descartar atividade antiga");
  await dialog.getByLabel("Descrição").fill("Período preservado após exclusão");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  await page
    .getByRole("button", {
      name: "Iniciar Descartar atividade antiga",
      exact: true,
    })
    .click();
  const globalTimer = page.getByRole("region", { name: "Cronômetro global" });
  await expect(globalTimer).toContainText("Descartar atividade antiga");
  await expect(
    globalTimer.getByRole("button", { name: "Parar" }),
  ).toBeVisible();
  await expect(globalTimer.getByLabel("Tempo em andamento")).not.toHaveText(
    "00:00:00",
  );
  await page
    .getByRole("button", { name: "Descartar atividade antiga", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir tarefa" })
    .click();

  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1 registro de horas está associado");
  await dialog.getByRole("button", { name: "Preservar as horas" }).click();
  await dialog.getByRole("button", { name: "Continuar" }).click();
  await expect(dialog).toContainText("1 registro será preservado");
  await dialog
    .getByRole("button", { name: "Salvar período e excluir tarefa" })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Descartar atividade antiga",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    globalTimer.getByRole("button", { name: "Retomar trabalho livre" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Horas", exact: true }).click();
  const row = page.locator(".hours-record");
  await expect(row).toHaveCount(1);
  await expect(row.first()).toContainText("Período preservado após exclusão");
  await expect(row.first()).toContainText("Sem projeto");
  await expect(row.first()).not.toContainText("· Descartar atividade antiga");
});
