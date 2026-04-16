import { expect, test } from "@playwright/test";
import { CONSENT_STORAGE_KEY } from "../../lib/consent/constants";

test.describe("Cookie-Einwilligung", () => {
  test("Banner, nur notwendige, erneut öffnen über Footer", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), CONSENT_STORAGE_KEY);
    await page.reload();

    const dialog = page.getByRole("dialog", { name: /Cookies und Einwilligung/i });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Nur notwendige", exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    await page.getByRole("navigation", { name: "Rechtliches" }).getByRole("button", { name: "Cookie-Einstellungen" }).click();
    await expect(page.getByRole("dialog", { name: /Cookie-Einstellungen/i })).toBeVisible();
  });
});
