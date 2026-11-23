import { expect, test } from "@playwright/test";

test("confirma o período ao arquivar um Cliente e restaura o trabalho pelo filtro", async ({
  page,
  request,
}) => {
  for (const fixture of ["board", "directory", "rate-limit"])
    expect(
      (await request.post(`http://127.0.0.1:4319/reset-${fixture}`)).status(),
    ).toBe(204);
  await page.goto("/clients");
  await page
    .getByLabel("Senha pessoal")
    .fill("senha pessoal de teste no navegador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const save = async () => {
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  };
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await dialog.getByLabel("Nome de exibição").fill("Oficina");
  await save();
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await dialog.getByLabel("Nome do projeto").fill("Catálogo");
  await dialog
    .getByRole("combobox", { name: "Cliente" })
    .selectOption({ label: "Oficina" });
  await dialog.getByLabel("Valor de hora").fill("120");
  await save();

  await page.getByRole("link", { name: "Quadro", exact: true }).click();
  await page.getByRole("button", { name: "Nova coluna" }).click();
  await dialog.getByLabel("Nome da coluna").fill("Em andamento");
  await save();
  await page.getByRole("button", { name: "+ Tarefa" }).click();
  await dialog.getByLabel("Título").fill("Revisar catálogo");
  await dialog.getByRole("combobox", { name: "Projeto" }).click();
  await page.getByRole("option", { name: "Catálogo" }).click();
  await save();
  await page.getByRole("button", { name: "Iniciar Revisar catálogo" }).click();
  const timer = page.getByRole("region", { name: "Cronômetro global" });
  await expect(timer).toContainText("Revisar catálogo");

  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  const askToArchive = async () => {
    await page
      .getByRole("button", { name: "Arquivar cliente Oficina" })
      .click();
    await dialog.getByRole("button", { name: "Arquivar", exact: true }).click();
    await expect(dialog.getByText(/Há um período em andamento/)).toBeVisible();
  };
  await askToArchive();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(timer).toContainText("Revisar catálogo");
  await askToArchive();
  await dialog
    .getByRole("button", { name: "Salvar período e arquivar" })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    timer.getByRole("button", { name: "Iniciar", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catálogo" })).toHaveCount(0);

  await page.getByRole("link", { name: "Quadro", exact: true }).click();
  const task = page.getByRole("button", {
    name: "Revisar catálogo",
    exact: true,
  });
  await expect(task).toHaveCount(0);
  await page.getByRole("combobox", { name: "Filtrar tarefas" }).click();
  await page.getByRole("option", { name: "Arquivadas" }).click();
  await expect(task).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar Revisar catálogo" }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Horas", exact: true }).click();
  await expect(
    page.locator(".hours-record").filter({ hasText: "Revisar catálogo" }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("combobox", { name: "Filtrar cadastros" }).click();
  await page.getByRole("option", { name: "Arquivados" }).click();
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
  await page.getByRole("button", { name: "Restaurar cliente Oficina" }).click();
  await dialog.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Quadro", exact: true }).click();
  await expect(task).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar Revisar catálogo" }),
  ).toBeVisible();
});
