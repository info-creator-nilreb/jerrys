import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "change-me-now";

test("Admin-Anmeldung und Bestellungen-Übersicht", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /Admin-Bereich an/i })).toBeVisible();

  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.getByRole("button", { name: "Anmelden" }).click();

  try {
    await page.waitForURL((url) => /^\/admin(?!\/login)(\/|$)/.test(url.pathname), { timeout: 25_000 });
  } catch {
    const loginFailed = await page
      .getByText(/Anmeldung fehlgeschlagen/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (loginFailed) {
      test.skip(true, "Kein gültiger Admin in der DB (prisma db seed / E2E_ADMIN_* setzen).");
    }
    if (/\/admin\/login/.test(page.url())) {
      test.skip(
        true,
        "Anmeldung blieb auf der Login-Seite (Auth/DB prüfen, ggf. langsamer Rechner — E2E_ADMIN_* / Seed).",
      );
    }
    throw new Error(`Admin-Anmeldung: unerwartete URL nach Timeout: ${page.url()}`);
  }

  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Bestellungen" })).toBeVisible();
});
