import { expect, test } from "@playwright/test";

test.describe("Security: Admin & öffentliche APIs", () => {
  test("Admin-Bereich ohne Session → Redirect zu Login", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Admin-APIs ohne Cookie → 401 JSON", async ({ request }) => {
    const search = await request.get("/api/admin/search?q=test");
    expect(search.status()).toBe(401);

    const alerts = await request.get(
      "/api/admin/order-alerts?since=2020-01-01T00:00:00.000Z",
    );
    expect(alerts.status()).toBe(401);
  });
});
