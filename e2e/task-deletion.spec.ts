import { expect, test } from "@playwright/test";

test("confere o destino das horas e exclui uma Tarefa em andamento", async ({
  page,
  request,
}) => {
  for (const fixture of ["board", "rate-limit"])
    expect(
      (await request.post(`http://127.0.0.1:4319/reset-${fixture}`)).status(),
    ).toBe(204);
  await page.goto("/");
  await page
    .getByLabel("Senha pessoal")
    .fill("senha pessoal de teste no navegador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  const dialog = page.getByRole("dialog");
  const save = async () => {
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  };
  await page.getByRole("button", { name: "Nova coluna" }).click();
  await dialog.getByLabel("Nome da coluna").fill("Em andamento");
  await save();
  await page.getByRole("button", { name: "+ Tarefa" }).click();
  const title = "Revisar catálogo";
  await dialog.getByLabel("Título").fill(title);
  await save();
  await page.getByRole("button", { name: `Iniciar ${title}` }).click();
  const timer = page.getByRole("region", { name: "Cronômetro global" });
  await expect(timer).toContainText(title);

  const task = page.getByRole("button", { name: title, exact: true });
  await task.click();
  await dialog.getByRole("button", { name: "Excluir tarefa" }).click();
  await expect(dialog).toContainText(
    "Registros vinculados a faturas válidas sempre serão preservados.",
  );
  await dialog.getByRole("button", { name: "Apagar horas" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Confirmar exclusão");
  await expect(dialog).toContainText("O cronômetro será parado");
  await expect(dialog).toContainText("Será apagado");
  await expect(
    page.locator("[data-task-card]").filter({ hasText: title }),
  ).toBeVisible();

  const otherTab = await page.context().newPage();
  await otherTab.goto("/");
  const otherTimer = otherTab.getByRole("region", {
    name: "Cronômetro global",
  });
  await otherTimer.getByRole("button", { name: "Parar", exact: true }).click();
  await expect(
    otherTimer.getByRole("button", { name: "Iniciar", exact: true }),
  ).toBeVisible();
  await otherTab.close();

  await dialog.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Os dados mudaram");
  await dialog.getByRole("button", { name: "Atualizar quadro" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(task).toBeVisible();
  await page.getByRole("button", { name: `Iniciar ${title}` }).click();
  await expect(
    timer.getByRole("button", { name: "Parar", exact: true }),
  ).toBeVisible();

  await task.click();
  await dialog.getByRole("button", { name: "Excluir tarefa" }).click();
  await dialog.getByRole("button", { name: "Preservar horas" }).click();
  await expect(dialog).toContainText("Será mantido sem tarefa");
  await dialog.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(task).toHaveCount(0);
  await expect(
    timer.getByRole("button", { name: "Iniciar", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Horas", exact: true }).click();
  await expect(
    page.locator(".hours-record").filter({ hasText: title }),
  ).toHaveCount(2);
});
