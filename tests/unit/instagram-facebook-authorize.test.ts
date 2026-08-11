import { afterEach, describe, expect, it } from "vitest";
import { buildFacebookAuthorizeUrl } from "@/lib/instagram/facebook-graph";

describe("buildFacebookAuthorizeUrl", () => {
  it("nutzt config_id ohne scope (Facebook Login for Business)", () => {
    const url = new URL(
      buildFacebookAuthorizeUrl(
        {
          appId: "996152426796104",
          appSecret: "secret",
          redirectUri: "https://example.com/api/admin/instagram/callback",
          facebookConfigId: "1234567890",
        },
        "state-token",
      ),
    );
    expect(url.searchParams.get("config_id")).toBe("1234567890");
    expect(url.searchParams.get("scope")).toBeNull();
    expect(url.searchParams.get("client_id")).toBe("996152426796104");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.com/api/admin/instagram/callback",
    );
  });

  it("fällt ohne Config-ID auf scope zurück", () => {
    const url = new URL(
      buildFacebookAuthorizeUrl(
        {
          appId: "996152426796104",
          appSecret: "secret",
          redirectUri: "https://example.com/api/admin/instagram/callback",
          facebookConfigId: null,
        },
        "state-token",
      ),
    );
    expect(url.searchParams.get("config_id")).toBeNull();
    expect(url.searchParams.get("scope")).toContain("instagram_basic");
  });
});

describe("facebook mode readiness needs config id", () => {
  const prev = {
    id: process.env.INSTAGRAM_APP_ID,
    secret: process.env.INSTAGRAM_APP_SECRET,
    site: process.env.NEXT_PUBLIC_SITE_URL,
    mode: process.env.INSTAGRAM_AUTH_MODE,
    configId: process.env.INSTAGRAM_FB_LOGIN_CONFIG_ID,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries({
      INSTAGRAM_APP_ID: prev.id,
      INSTAGRAM_APP_SECRET: prev.secret,
      NEXT_PUBLIC_SITE_URL: prev.site,
      INSTAGRAM_AUTH_MODE: prev.mode,
      INSTAGRAM_FB_LOGIN_CONFIG_ID: prev.configId,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("blockiert facebook-Mode ohne Config-ID", async () => {
    process.env.INSTAGRAM_APP_ID = "996152426796104";
    process.env.INSTAGRAM_APP_SECRET = "secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.INSTAGRAM_AUTH_MODE = "facebook";
    delete process.env.INSTAGRAM_FB_LOGIN_CONFIG_ID;
    const { getInstagramOAuthReadiness } = await import("@/lib/instagram/config");
    const readiness = getInstagramOAuthReadiness("https://example.com");
    expect(readiness.ready).toBe(false);
    expect(readiness.blockReason).toContain("INSTAGRAM_FB_LOGIN_CONFIG_ID");
  });

  it("ist bereit mit Config-ID", async () => {
    process.env.INSTAGRAM_APP_ID = "996152426796104";
    process.env.INSTAGRAM_APP_SECRET = "secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.INSTAGRAM_AUTH_MODE = "facebook";
    process.env.INSTAGRAM_FB_LOGIN_CONFIG_ID = "9876543210";
    const { getInstagramOAuthReadiness } = await import("@/lib/instagram/config");
    const readiness = getInstagramOAuthReadiness("https://example.com");
    expect(readiness.ready).toBe(true);
  });
});
