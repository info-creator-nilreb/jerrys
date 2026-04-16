import { expect, test } from "@playwright/test";
import { CONSENT_STORAGE_KEY } from "../../lib/consent/constants";
import { buildConsentRecord, serializeConsent } from "../../lib/consent/storage";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "change-me-now";

/** Seriell: gemeinsame DB / Lagerbestand, keine parallelen Checkouts. */
test.describe.serial("Checkout & Admin-Spiegel", () => {
  test("Kunde bestellt, Bestellung erscheint im Admin", async ({ page }) => {
    test.setTimeout(120_000);
    const consentJson = serializeConsent(buildConsentRecord({ statistics: false, marketing: false }));
    await page.addInitScript(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      { key: CONSENT_STORAGE_KEY, value: consentJson },
    );
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

    await page.waitForURL(/\/(checkout|warenkorb)/, { timeout: 15_000 });
    if (/\/warenkorb/.test(new URL(page.url()).pathname)) {
      test.skip(
        true,
        "Checkout nicht erreichbar (z. B. PayPal nicht konfiguriert). In CI: GitHub Secrets PAYPAL_SANDBOX_CLIENT_ID und PAYPAL_SANDBOX_CLIENT_SECRET setzen.",
      );
    }
    await expect(page.locator("#email")).toBeVisible({ timeout: 15_000 });

    await page.locator("#email").fill("e2e-kunde@example.invalid");
    await page.locator("#shippingFirstName").fill("E2E");
    await page.locator("#shippingLastName").fill("Kunde");
    await page.locator("#shippingLine1").fill("Teststraße 1");
    await page.locator("#shippingZip").fill("10115");
    await page.locator("#shippingCity").fill("Berlin");

    await page.locator("#rechtlicheKenntnis").check();

    await page.getByRole("button", { name: /Jetzt kostenpflichtig bestellen/ }).click();
    await page.waitForURL(
      (url) => {
        const p = url.pathname;
        return p.startsWith("/checkout/erfolg") || url.hostname.includes("paypal.com");
      },
      { timeout: 60_000 },
    );
    if (new URL(page.url()).hostname.includes("paypal.com")) {
      test.skip(
        true,
        "Checkout leitet zu PayPal — vollständiger Bestell-E2E ohne PayPal-Sandbox-Automation nicht fortsetzbar.",
      );
    }

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
