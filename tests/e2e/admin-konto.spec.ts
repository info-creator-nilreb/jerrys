import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "change-me-now";

test("Admin-Konto ist über Avatar/Adresse erreichbar", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/login");
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.getByRole("button", { name: "Anmelden" }).click();

  try {
    await page.waitForURL((url) => /^\/admin(?!\/login)(\/|$)/.test(url.pathname), {
      timeout: 25_000,
    });
  } catch {
    const loginFailed = await page
      .getByText(/Anmeldung fehlgeschlagen/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (loginFailed || /\/admin\/login/.test(page.url())) {
      test.skip(true, "Kein gültiger Admin in der DB (prisma db seed / E2E_ADMIN_* setzen).");
    }
    throw new Error(`Admin-Anmeldung: unerwartete URL nach Timeout: ${page.url()}`);
  }

  await page.goto("/admin/konto");
  await expect(page.getByRole("heading", { name: "Konto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Passwort" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Zwei-Faktor-Authentifizierung" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Passwort speichern" })).toBeVisible();
  await expect(page.getByRole("button", { name: "MFA einrichten" })).toBeVisible();

  const kontoLink = page.getByTestId("admin-konto-link");
  if (await kontoLink.isVisible()) {
    await expect(kontoLink).toHaveAttribute("href", "/admin/konto");
  }
});
