import { expect, test } from "@playwright/test";
import { CONSENT_STORAGE_KEY } from "../../lib/consent/constants";
import { buildConsentRecord, serializeConsent } from "../../lib/consent/storage";

async function dismissConsentBanner(page: import("@playwright/test").Page) {
  const consentJson = serializeConsent(buildConsentRecord({ statistics: false, marketing: false }));
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: CONSENT_STORAGE_KEY, value: consentJson },
  );
}

test.describe("Katalog Filter & Sortierung", () => {
  test("/produkte übernimmt Sort- und Verfügbarkeits-Params", async ({ page }) => {
    await dismissConsentBanner(page);
    await page.goto("/produkte?sort=title-asc&verfuegbar=1");
    await expect(page.getByRole("heading", { name: "Produkte" })).toBeVisible();

    const desktopSort = page.locator("#collection-sort");
    await expect(desktopSort).toBeVisible();
    await expect(desktopSort).toHaveValue("title-asc");
    await expect(page.getByLabel("Nur verfügbare Produkte")).toBeChecked();
    await expect(page.getByRole("link", { name: "Filter zurücksetzen" })).toBeVisible();
  });

  test("Mobile Filter-Sheet öffnet und schließt per Escape", async ({ page }) => {
    await dismissConsentBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/produkte?sort=price-asc&verfuegbar=1");
    await expect(page.getByRole("heading", { name: "Produkte" })).toBeVisible();

    const trigger = page.getByRole("button", { name: /Filter & Sortierung/i });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: /Filter & Sortierung/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel("Sortierung")).toHaveValue("price-asc");
    await expect(sheet.getByLabel("Nur verfügbare Produkte")).toBeChecked();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});
