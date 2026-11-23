import { expect, test } from "@playwright/test";

test("inicia, troca e retoma Tarefas preservando períodos e horas dos cards", async ({
  page,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:4319/reset-board");
  await request.post("http://127.0.0.1:4319/reset-directory");
  await request.post("http://127.0.0.1:4319/reset-rate-limit");
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
