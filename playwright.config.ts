import { defineConfig, devices } from "@playwright/test";

const devPort = process.env.PORT ?? "3001";
const devOrigin = `http://127.0.0.1:${devPort}`;

/** CI: Server läuft bereits (`next start` nach Build); kein `npm run dev` starten. */
const skipWebServer = process.env.PLAYWRIGHT_WEB_SERVER === "none";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",
  use: {
    baseURL: devOrigin,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: skipWebServer
    ? undefined
    : {
        command: "npm run dev",
        url: devOrigin,
        reuseExistingServer: !process.env.CI,
      },
});
