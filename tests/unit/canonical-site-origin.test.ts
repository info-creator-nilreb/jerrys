import { afterEach, describe, expect, it } from "vitest";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

const keys = ["NEXT_PUBLIC_SITE_URL", "AUTH_URL", "VERCEL_URL"] as const;
const previous: Partial<Record<(typeof keys)[number], string | undefined>> = {};

afterEach(() => {
  for (const key of keys) {
    if (key in previous) {
      const v = previous[key];
      if (v === undefined) delete process.env[key];
      else process.env[key] = v;
      delete previous[key];
    }
  }
});

function setEnv(key: (typeof keys)[number], value: string | undefined) {
  if (!(key in previous)) previous[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("canonicalSiteOrigin", () => {
  it("bevorzugt NEXT_PUBLIC_SITE_URL vor AUTH_URL/VERCEL_URL", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example/");
    setEnv("AUTH_URL", "https://ecom-preview.vercel.app");
    setEnv("VERCEL_URL", "ecom-preview.vercel.app");
    expect(canonicalSiteOrigin()).toBe("https://shop.example");
  });

  it("fällt auf AUTH_URL zurück wenn Site-URL fehlt", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", undefined);
    setEnv("AUTH_URL", "https://auth.example");
    setEnv("VERCEL_URL", undefined);
    expect(canonicalSiteOrigin()).toBe("https://auth.example");
  });
});
