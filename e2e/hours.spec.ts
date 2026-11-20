import { expect, test } from "@playwright/test";

test("lança, corrige e filtra registros de horas", async ({
  page,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:4319/reset-rate-limit");
  await page.goto("/hours");
  await page
    .getByLabel("Senha pessoal")
    .fill("senha pessoal de teste no navegador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  const clientName = `Estúdio ${testInfo.project.name}`;
  const projectName = `Protótipo ${testInfo.project.name}`;
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Novo cliente" }).click();
  const cadastro = page.getByRole("dialog");
  await cadastro.getByLabel("Nome de exibição").fill(clientName);
  await cadastro.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(cadastro).toBeHidden();
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await cadastro.getByLabel("Nome do projeto").fill(projectName);
  await cadastro
    .getByLabel("Cliente", { exact: false })
    .selectOption({ label: clientName });
  await cadastro.getByLabel("Valor de hora").fill("175,50");
  await cadastro.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(cadastro).toBeHidden();
  await page.getByRole("link", { name: "Horas", exact: true }).click();

  const day = testInfo.project.name === "mobile" ? "2025-05-02" : "2025-05-01";
  const create = page.getByRole("button", { name: "Registro manual" });
  await create.click();
  const dialog = page.getByRole("dialog", { name: "Registro manual" });
  await dialog.getByLabel("Descrição").fill("Pesquisa de interface");
  await dialog.getByLabel("Início", { exact: true }).fill(day + "T09:00:03");
  await dialog.getByLabel("Fim", { exact: true }).fill(day + "T09:00:40");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog).toBeHidden();

  const filters = page.getByRole("group", { name: "Filtros de horas" });
  await filters.getByLabel("De", { exact: true }).fill(day);
  await filters.getByLabel("Até", { exact: true }).fill(day);
  await expect(page.locator(".hours-record")).toHaveCount(1);
  const row = page.locator(".hours-record").first();
  await expect(row).toContainText("Sem projeto");
  await expect(row).toContainText("00:00:37");
  const hourlyRate = await row.getByText(/\/ hora/).textContent();
  const trigger = row.getByRole("button", { name: /Pesquisa de interface/ });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await row.getByLabel("Descrição").fill("Descartar");
  await row.getByRole("button", { name: "Cancelar" }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();

  await create.click();
  await dialog.getByLabel("Início", { exact: true }).fill(day + "T09:00:10");
  await dialog.getByLabel("Fim", { exact: true }).fill(day + "T09:00:50");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog.getByRole("alert")).toContainText("se sobrepõe");
  await expect(dialog.getByRole("alert")).toContainText(
    "Pesquisa de interface",
  );
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await trigger.click();
  await expect(row.getByLabel("Descrição")).toHaveValue(
    "Pesquisa de interface",
  );
  await row.getByLabel("Descrição").fill("Pesquisa revisada");
  await row.getByLabel("Fim", { exact: true }).fill(day + "T09:00:51");
  await expect(
    row.getByRole("button", { name: "Salvar alterações" }),
  ).toBeVisible();
  await row.getByRole("combobox", { name: "Projeto", exact: true }).click();
  await page.getByRole("option", { name: projectName }).click();
  await expect(
    row.getByRole("combobox", { name: "Cliente", exact: true }),
  ).toContainText(clientName);
  await row.screenshot({ path: testInfo.outputPath("hours-editor.png") });
  await row.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(row).toContainText("Pesquisa revisada");
  await expect(row).toContainText("00:00:48");
  await expect(row).toContainText(projectName);
  await expect(row.getByText(/\/ hora/)).toHaveText(hourlyRate!);
  await filters.getByRole("combobox", { name: "Cliente", exact: true }).click();
  await page.getByRole("option", { name: clientName }).click();
  await filters.getByRole("combobox", { name: "Projeto", exact: true }).click();
  await page.getByRole("option", { name: projectName }).click();
  await expect(row).toContainText(projectName);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Pesquisa revisada/ }).first(),
  ).toBeVisible();
  await filters.getByLabel("De", { exact: true }).fill("2025-05-03");
  await filters.getByLabel("Até", { exact: true }).fill("2025-05-03");
  await expect(
    page.getByRole("heading", { name: "Nenhum registro para estes filtros" }),
  ).toBeVisible();
});
