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
    await page.getByRole("button", { name: /^Filter/ }).click();
    const desktopFilter = page.locator('[id$="-desktop-filter"]');
    await expect(desktopFilter.getByLabel("Nur verfügbare Produkte")).toBeChecked();
    await expect(page.getByRole("link", { name: "Filter zurücksetzen" })).toBeVisible();
  });

  test("Mobile Filter-Sheet öffnet und schließt per Escape", async ({ page }) => {
    await dismissConsentBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/produkte?sort=price-asc&verfuegbar=1");
    await expect(page.getByRole("heading", { name: "Produkte" })).toBeVisible();

    const mobileSort = page.locator("#collection-sort");
    await expect(mobileSort).toBeVisible();
    await expect(mobileSort).toHaveValue("price-asc");

    const trigger = page.getByRole("button", { name: /^Filter(\s+\d+)?$/ });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Filter" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel("Nur verfügbare Produkte")).toBeChecked();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("Storefront-Suche filtert /produkte per q", async ({ page }) => {
    await dismissConsentBanner(page);
    await page.goto("/produkte?q=höhle");
    await expect(page.getByRole("heading", { name: /Suche:/i })).toBeVisible();
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Produkte suchen" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /Suche/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Suche zurücksetzen" })).toBeVisible();
  });

  test("Header-Suche öffnet Dialog und navigiert zu /produkte", async ({ page }) => {
    await dismissConsentBanner(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Produkte suchen" }).click();
    const dialog = page.getByRole("dialog", { name: /Produkte suchen/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Produkte suchen").fill("futternapf");
    await dialog.getByRole("button", { name: "Suchen", exact: true }).click();
    await page.waitForURL(/\/produkte\?q=/);
    await expect(page.getByRole("heading", { name: /Suche:/i })).toBeVisible();
  });

  test("Typeahead zeigt Produktvorschläge während der Eingabe", async ({ page }) => {
    await dismissConsentBanner(page);
    await page.goto("/produkte");
    await page.getByRole("button", { name: "Produkte suchen" }).click();
    const dialog = page.getByRole("dialog", { name: /Produkte suchen/i });
    const search = dialog.getByRole("combobox", { name: "Produkte suchen" });
    await search.fill("höhle");
    const listbox = dialog.getByRole("listbox", { name: "Produktvorschläge" });
    await expect(listbox).toBeVisible({ timeout: 10_000 });
    const option = listbox.getByRole("option").first();
    await expect(option).toBeVisible();
    await option.click();
    await page.waitForURL(/\/produkte\/[^?]+/);
    await expect(page).not.toHaveURL(/\/produkte\?/);
  });
});
