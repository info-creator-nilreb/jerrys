import { expect, test } from "@playwright/test";

test("Startseite lädt", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Katzenhöhle mit Stil" })).toBeVisible();
});

test("Produktübersicht lädt", async ({ page }) => {
  await page.goto("/produkte");
  await expect(page.getByRole("heading", { name: "Produkte" })).toBeVisible();
});

test("Impressum lädt", async ({ page }) => {
  await page.goto("/impressum");
  await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
});

test("Sitemap und llms.txt liefern 200", async ({ request }) => {
  const sm = await request.get("/sitemap.xml");
  expect(sm.ok()).toBeTruthy();
  expect(sm.headers()["content-type"] ?? "").toMatch(/xml/i);

  const llms = await request.get("/llms.txt");
  expect(llms.ok()).toBeTruthy();
  expect(llms.headers()["content-type"] ?? "").toMatch(/text\/plain/i);
});
