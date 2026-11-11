import { expect, test } from "@playwright/test";

test("cronômetro persiste entre duas sessões e retoma sem incluir pausa", async ({
  page,
  browser,
  request,
}, testInfo) => {
  await request.post("http://127.0.0.1:4319/reset-rate-limit");
  const other = await browser.newContext();
  const second = await other.newPage();
  try {
    for (const session of [page, second]) {
      await session.goto("/hours");
      await session
        .getByLabel("Senha pessoal")
        .fill("senha pessoal de teste no navegador");
      await session
        .getByRole("button", { name: "Entrar", exact: true })
        .click();
      await expect(
        session.getByRole("heading", { name: "Horas", exact: true }),
      ).toBeVisible();
    }
    // Stop a leftover period when running the second viewport project.
    const global = page.getByRole("region", { name: "Cronômetro global" });
    if (
      await global
        .getByRole("button", { name: "Parar", exact: true })
        .isVisible()
    ) {
      await global.getByRole("button", { name: "Parar", exact: true }).click();
      await expect(
        global.getByRole("button", { name: "Iniciar", exact: true }),
      ).toBeVisible();
    }
    await expect(
      second.getByRole("button", { name: "Iniciar", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    const before = await page.locator(".hours-record").count();
    await global.getByRole("button", { name: "Iniciar", exact: true }).click();
    await expect(
      global.getByRole("button", { name: "Parar", exact: true }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Parar", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(global.getByLabel("Tempo em andamento")).not.toHaveText(
      "00:00:00",
    );
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Cronômetro iniciado." }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("timer-toast.png"),
      fullPage: true,
    });
    await page.reload();
    await expect(
      global.getByRole("button", { name: "Parar", exact: true }),
    ).toBeVisible();
    await second.getByRole("button", { name: "Parar", exact: true }).click();
    await expect(
      second
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Período salvo." }),
    ).toBeVisible();
    await expect(
      global.getByRole("button", { name: "Iniciar", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".hours-record")).toHaveCount(before + 1);
    const firstPeriod = await page
      .locator(".hours-record")
      .first()
      .textContent();
    await global
      .getByRole("button", { name: "Retomar trabalho livre" })
      .click();
    await expect(
      global.getByRole("button", { name: "Parar", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".hours-record")).toHaveCount(before + 2);
    const resumedToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Trabalho livre retomado." });
    await expect(resumedToast).toBeVisible();
    await resumedToast
      .getByRole("button", { name: "Fechar notificação" })
      .click();
    await expect(resumedToast).not.toBeVisible();
    expect(await page.locator(".hours-record").nth(1).textContent()).toBe(
      firstPeriod,
    );
    await page.context().setOffline(true);
    await global.getByRole("button", { name: "Parar", exact: true }).click();
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Não foi possível controlar o cronômetro" }),
    ).toContainText("Conecte-se");
    await expect(global.locator(".timer-feedback")).toHaveCount(0);
    await page.context().setOffline(false);
    await page.reload();
    await expect(
      global.getByRole("button", { name: "Parar", exact: true }),
    ).toBeVisible();
    await global.getByRole("button", { name: "Parar", exact: true }).click();
    await expect(
      global.getByRole("button", { name: "Iniciar", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Configurações" }).click();
    const preferences = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", {
          name: "Preferências de trabalho",
          exact: true,
        }),
      })
      .last();
    const rate = testInfo.project.name === "mobile" ? "234,56" : "123,45";
    await page.getByLabel("Valor de hora padrão").fill(rate);
    await page.getByLabel("Moeda padrão").selectOption("USD");
    await page.getByLabel("Fuso horário").fill("UTC");
    await page
      .getByRole("button", { name: "Salvar preferências", exact: true })
      .click();
    await expect(preferences.getByRole("status")).toHaveText(
      "Preferências salvas.",
    );
    await page.reload();
    await expect(page.getByLabel("Valor de hora padrão")).toHaveValue(rate);
    await expect(page.getByLabel("Fuso horário")).toHaveValue("UTC");
    await page.screenshot({
      path: testInfo.outputPath("timer-settings.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Horas", exact: true }).click();
    await page.screenshot({
      path: testInfo.outputPath("timer-hours.png"),
      fullPage: true,
    });
  } finally {
    await other.close();
  }
});
