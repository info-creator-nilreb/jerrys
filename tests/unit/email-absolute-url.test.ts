import { afterEach, describe, expect, it } from "vitest";
import {
  CANONICAL_PUBLIC_SHOP_ORIGIN,
  absoluteUrlForEmail,
  emailAbsoluteHref,
  resolvedEmailAssetBase,
  runWithEmailAssetBaseUrl,
} from "@/lib/email/email-absolute-url";

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

describe("resolvedEmailAssetBase", () => {
  it("bevorzugt eine echte Shop-URL vor AUTH_URL und VERCEL_URL", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example/");
    setEnv("AUTH_URL", "https://preview-xyz.vercel.app");
    setEnv("VERCEL_URL", "preview-xyz.vercel.app");
    expect(resolvedEmailAssetBase()).toBe("https://shop.example");
    expect(absoluteUrlForEmail("/branding/email-icons/check.png")).toBe(
      "https://shop.example/branding/email-icons/check.png",
    );
  });

  it("nutzt AUTH_URL wenn die Shop-URL fehlt und der Host nicht vercel.app ist", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", undefined);
    setEnv("AUTH_URL", "https://auth.example");
    setEnv("VERCEL_URL", "preview-xyz.vercel.app");
    expect(resolvedEmailAssetBase()).toBe("https://auth.example");
  });

  it("nutzt https://jerry-s.com aus NEXT_PUBLIC_SITE_URL unverändert", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://jerry-s.com/");
    setEnv("AUTH_URL", "https://ecom-seven-livid.vercel.app");
    expect(resolvedEmailAssetBase()).toBe("https://jerry-s.com");
    expect(emailAbsoluteHref("/checkout/erfolg?nr=J-1")).toBe(
      "https://jerry-s.com/checkout/erfolg?nr=J-1",
    );
  });

  it("ignoriert NEXT_PUBLIC_SITE_URL auf *.vercel.app zugunsten von jerry-s.com", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://ecom-seven-livid.vercel.app");
    setEnv("AUTH_URL", "https://ecom-seven-livid.vercel.app");
    setEnv("VERCEL_URL", "ecom-seven-livid.vercel.app");
    expect(resolvedEmailAssetBase()).toBe(CANONICAL_PUBLIC_SHOP_ORIGIN);
    expect(emailAbsoluteHref("/checkout/erfolg?nr=J-1")).toBe(
      "https://jerry-s.com/checkout/erfolg?nr=J-1",
    );
  });

  it("fällt ohne brauchbare Env auf jerry-s.com zurück", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", undefined);
    setEnv("AUTH_URL", "https://jerrys.vercel.app");
    setEnv("VERCEL_URL", "jerrys.vercel.app");
    expect(resolvedEmailAssetBase()).toBe(CANONICAL_PUBLIC_SHOP_ORIGIN);
  });

  it("verwendet kein localhost, sondern die kanonische Shop-Domain", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3001");
    setEnv("AUTH_URL", "http://localhost:3001");
    setEnv("VERCEL_URL", undefined);
    expect(resolvedEmailAssetBase()).toBe(CANONICAL_PUBLIC_SHOP_ORIGIN);
    expect(absoluteUrlForEmail("/logo.png")).toBe("https://jerry-s.com/logo.png");
  });

  it("lässt https-Blob-URLs unverändert", () => {
    expect(absoluteUrlForEmail("https://blob.vercel-storage.com/logo.png")).toBe(
      "https://blob.vercel-storage.com/logo.png",
    );
  });

  it("schreibt alte Vercel-URLs auf jerry-s.com um", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://jerry-s.com");
    expect(
      absoluteUrlForEmail("https://ecom-seven-livid.vercel.app/branding/jerrys-wordmark.jpg"),
    ).toBe("https://jerry-s.com/branding/jerrys-wordmark.jpg");
    expect(absoluteUrlForEmail("https://www.jerry-s.com/media/product.jpg")).toBe(
      "https://jerry-s.com/media/product.jpg",
    );
  });

  it("Admin-Vorschau-Override gewinnt vor Env", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    const url = runWithEmailAssetBaseUrl("https://preview.example.com", () =>
      absoluteUrlForEmail("/branding/jerrys-wordmark.jpg"),
    );
    expect(url).toBe("https://preview.example.com/branding/jerrys-wordmark.jpg");
  });
});
