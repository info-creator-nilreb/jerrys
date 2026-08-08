import { expect, test } from "@playwright/test";

test.describe("Katalog Filter & Sortierung", () => {
  test("/produkte übernimmt Sort- und Verfügbarkeits-Params", async ({ page }) => {
    await page.goto("/produkte?sort=title-asc&verfuegbar=1");
    await expect(page.getByRole("heading", { name: "Produkte" })).toBeVisible();

    // Desktop-Toolbar (md+) oder Mobile-Trigger — mindestens eine Sort-Control
    const desktopSort = page.locator("#collection-sort");
    const mobileTrigger = page.getByRole("button", { name: /Filter & Sortierung/i });

    if (await desktopSort.isVisible()) {
      await expect(desktopSort).toHaveValue("title-asc");
      await expect(page.getByLabel("Nur verfügbare Produkte")).toBeChecked();
    } else {
      await expect(mobileTrigger).toBeVisible();
      await mobileTrigger.click();
      const sheet = page.getByRole("dialog", { name: /Filter & Sortierung/i });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByLabel("Sortierung")).toHaveValue("title-asc");
      await expect(sheet.getByLabel("Nur verfügbare Produkte")).toBeChecked();
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
    }

    await expect(page.getByRole("link", { name: "Filter zurücksetzen" })).toBeVisible();
  });
});
