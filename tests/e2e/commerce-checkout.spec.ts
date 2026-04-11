import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "change-me-now";

/** Seriell: gemeinsame DB / Lagerbestand, keine parallelen Checkouts. */
test.describe.serial("Checkout & Admin-Spiegel", () => {
  test("Kunde bestellt, Bestellung erscheint im Admin", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/produkte");
    const addBtn = page.getByRole("button", { name: "In den Warenkorb" }).first();
    const hasProduct = await addBtn.isVisible().catch(() => false);
    if (!hasProduct) {
      test.skip(true, "Keine bestellbaren Produkte (Shop leer oder nicht lagernd).");
    }

    await addBtn.click();
    await expect(page.getByText("Zum Warenkorb hinzugefügt.")).toBeVisible({ timeout: 20_000 });

    await page.goto("/warenkorb");
    await expect(page.getByRole("heading", { name: "Dein Warenkorb" })).toBeVisible();
    await page.getByRole("link", { name: "Zur Kasse" }).click();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 15_000 });

    await page.locator("#email").fill("e2e-kunde@example.invalid");
    await page.locator("#shippingFirstName").fill("E2E");
    await page.locator("#shippingLastName").fill("Kunde");
    await page.locator("#shippingLine1").fill("Teststraße 1");
    await page.locator("#shippingZip").fill("10115");
    await page.locator("#shippingCity").fill("Berlin");

    await page.getByRole("button", { name: "Jetzt bestellen" }).click();
    await page.waitForURL(/\/checkout\/erfolg/, { timeout: 60_000 });

    await expect(page.getByRole("heading", { name: "Bestellung eingegangen" })).toBeVisible();
    const orderNrLoc = page.locator("span.font-mono.font-semibold");
    await expect(orderNrLoc).toBeVisible();
    const orderNumber = (await orderNrLoc.textContent())?.trim();
    expect(orderNumber).toBeTruthy();

    await page.goto("/admin/login");
    await page.locator('input[name="email"]').fill(adminEmail);
    await page.locator('input[name="password"]').fill(adminPassword);
    await page.getByRole("button", { name: "Anmelden" }).click();
    try {
      await page.waitForURL((url) => /^\/admin(?!\/login)(\/|$)/.test(url.pathname), { timeout: 25_000 });
    } catch {
      if (await page.getByText(/Anmeldung fehlgeschlagen/i).isVisible()) {
        test.skip(true, "Kein gültiger Admin in der DB (prisma db seed / E2E_ADMIN_* setzen).");
      }
      if (/\/admin\/login/.test(page.url())) {
        test.skip(true, "Admin-Login nach Checkout nicht möglich (siehe E2E_ADMIN_* / Seed).");
      }
      throw new Error(`Admin-Anmeldung: Timeout, URL ${page.url()}`);
    }

    await page.goto("/admin/orders");
    await expect(page.locator("tbody").getByText(orderNumber!, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});
