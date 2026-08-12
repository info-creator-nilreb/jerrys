import { afterEach, describe, expect, it } from "vitest";
import { getZettleWebhookDestinationUrl } from "@/features/inventory/application/ensure-zettle-webhook";

const keys = ["NEXT_PUBLIC_SITE_URL", "AUTH_URL", "VERCEL_URL"] as const;

describe("getZettleWebhookDestinationUrl", () => {
  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
      delete prev[k];
    }
  });

  function setEnv( partial: Partial<Record<(typeof keys)[number], string | undefined>>) {
    for (const k of keys) {
      if (!(k in prev)) prev[k] = process.env[k];
      const v = partial[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  it("bevorzugt NEXT_PUBLIC_SITE_URL vor AUTH_URL", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://shop.example.com",
      AUTH_URL: "https://auth.example.com",
      VERCEL_URL: undefined,
    });
    expect(getZettleWebhookDestinationUrl()).toBe(
      "https://shop.example.com/api/webhooks/zettle",
    );
  });

  it("fällt auf AUTH_URL zurück", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: undefined,
      AUTH_URL: "https://auth.example.com/",
      VERCEL_URL: undefined,
    });
    expect(getZettleWebhookDestinationUrl()).toBe(
      "https://auth.example.com/api/webhooks/zettle",
    );
  });

  it("lehnt localhost ab", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3001",
      AUTH_URL: undefined,
      VERCEL_URL: undefined,
    });
    expect(getZettleWebhookDestinationUrl()).toBeNull();
  });
});
