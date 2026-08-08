import { afterEach, describe, expect, it } from "vitest";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";

const envKeys = [
  "VERCEL_ENV",
  "VERCEL_URL",
  "AUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function snapshotEnv(): Record<(typeof envKeys)[number], string | undefined> {
  return Object.fromEntries(envKeys.map((k) => [k, process.env[k]])) as Record<
    (typeof envKeys)[number],
    string | undefined
  >;
}

function restoreEnv(snapshot: Record<(typeof envKeys)[number], string | undefined>) {
  for (const k of envKeys) {
    const v = snapshot[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("syncAuthUrlForVercelPreview", () => {
  afterEach(() => {
    /* restored per test */
  });

  it("setzt AUTH_URL auf Preview-Deployment wenn Production-URL konfiguriert ist", () => {
    const before = snapshotEnv();
    try {
      process.env.VERCEL_ENV = "preview";
      process.env.VERCEL_URL = "jerrys-git-main-nilreb.vercel.app";
      process.env.AUTH_URL = "https://shop.example.com";
      process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.com";

      syncAuthUrlForVercelPreview();

      expect(process.env.AUTH_URL).toBe(
        "https://jerrys-git-main-nilreb.vercel.app",
      );
      expect(process.env.NEXT_PUBLIC_SITE_URL).toBe(
        "https://jerrys-git-main-nilreb.vercel.app",
      );
    } finally {
      restoreEnv(before);
    }
  });

  it("ändert nichts außerhalb von Vercel Preview", () => {
    const before = snapshotEnv();
    try {
      process.env.VERCEL_ENV = "production";
      process.env.VERCEL_URL = "jerrys.vercel.app";
      process.env.AUTH_URL = "https://shop.example.com";

      syncAuthUrlForVercelPreview();

      expect(process.env.AUTH_URL).toBe("https://shop.example.com");
    } finally {
      restoreEnv(before);
    }
  });
});
