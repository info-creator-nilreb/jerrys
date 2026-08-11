import { afterEach, describe, expect, it } from "vitest";
import { maskInstagramAppId } from "@/lib/instagram/config";

describe("maskInstagramAppId", () => {
  it("maskiert lange IDs", () => {
    expect(maskInstagramAppId("123456789012345")).toBe("1234…2345");
  });

  it("kürzere IDs komplett maskiert", () => {
    expect(maskInstagramAppId("123")).toBe("••••");
  });
});

describe("getInstagramAppConfig", () => {
  const prev = {
    id: process.env.INSTAGRAM_APP_ID,
    secret: process.env.INSTAGRAM_APP_SECRET,
    site: process.env.NEXT_PUBLIC_SITE_URL,
    auth: process.env.AUTH_URL,
    redirect: process.env.INSTAGRAM_REDIRECT_URI,
    vercelEnv: process.env.VERCEL_ENV,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries({
      INSTAGRAM_APP_ID: prev.id,
      INSTAGRAM_APP_SECRET: prev.secret,
      NEXT_PUBLIC_SITE_URL: prev.site,
      AUTH_URL: prev.auth,
      INSTAGRAM_REDIRECT_URI: prev.redirect,
      VERCEL_ENV: prev.vercelEnv,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("baut Redirect aus Site-URL und ignoriert Preview-VERCEL_URL", async () => {
    process.env.INSTAGRAM_APP_ID = "1111222233334444";
    process.env.INSTAGRAM_APP_SECRET = "secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.VERCEL_URL = "fecom-preview-xyz.vercel.app";
    delete process.env.INSTAGRAM_REDIRECT_URI;
    delete process.env.AUTH_URL;
    const { getInstagramAppConfig } = await import("@/lib/instagram/config");
    const cfg = getInstagramAppConfig();
    expect(cfg?.redirectUri).toBe("https://example.com/api/admin/instagram/callback");
  });

  it("bevorzugt INSTAGRAM_REDIRECT_URI", async () => {
    process.env.INSTAGRAM_APP_ID = "1111222233334444";
    process.env.INSTAGRAM_APP_SECRET = "secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.INSTAGRAM_REDIRECT_URI =
      "https://shop.example.com/api/admin/instagram/callback";
    const { getInstagramAppConfig } = await import("@/lib/instagram/config");
    const cfg = getInstagramAppConfig();
    expect(cfg?.redirectUri).toBe(
      "https://shop.example.com/api/admin/instagram/callback",
    );
  });

  it("ignoriert Preview-AUTH_URL wenn keine stabile Site-URL gesetzt ist", async () => {
    process.env.INSTAGRAM_APP_ID = "1111222233334444";
    process.env.INSTAGRAM_APP_SECRET = "secret";
    process.env.VERCEL_ENV = "preview";
    process.env.AUTH_URL = "https://fecom-preview-xyz.vercel.app";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.INSTAGRAM_REDIRECT_URI;
    const { getInstagramAppConfig } = await import("@/lib/instagram/config");
    expect(getInstagramAppConfig()).toBeNull();
  });

  it("blockiert OAuth wenn Request-Origin von Redirect-URI abweicht", async () => {
    process.env.INSTAGRAM_APP_ID = "1111222233334444";
    process.env.INSTAGRAM_APP_SECRET = "secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    const { getInstagramOAuthReadiness } = await import("@/lib/instagram/config");
    const readiness = getInstagramOAuthReadiness("https://preview.vercel.app");
    expect(readiness.ready).toBe(false);
    expect(readiness.blockReason).toContain("dieselbe Domain");
    expect(readiness.metaAppDomain).toBe("example.com");
  });
});
