import { afterEach, describe, expect, it } from "vitest";
import {
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
  it("bevorzugt NEXT_PUBLIC_SITE_URL vor AUTH_URL und VERCEL_URL", () => {
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

  it("überspringt AUTH_URL auf *.vercel.app zugunsten der öffentlichen Shop-URL", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "https://www.jerrys.example");
    setEnv("AUTH_URL", "https://jerrys-git-main.vercel.app");
    setEnv("VERCEL_URL", "jerrys-git-main.vercel.app");
    expect(emailAbsoluteHref("/checkout/erfolg?nr=J-1")).toBe(
      "https://www.jerrys.example/checkout/erfolg?nr=J-1",
    );
  });

  it("fällt nur ohne Shop-URL auf den Deployment-Host zurück", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", undefined);
    setEnv("AUTH_URL", "https://jerrys.vercel.app");
    setEnv("VERCEL_URL", "jerrys.vercel.app");
    expect(resolvedEmailAssetBase()).toBe("https://jerrys.vercel.app");
  });

  it("verwendet kein localhost", () => {
    setEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3001");
    setEnv("AUTH_URL", "http://localhost:3001");
    setEnv("VERCEL_URL", undefined);
    expect(resolvedEmailAssetBase()).toBe("");
    expect(absoluteUrlForEmail("/logo.png")).toBeNull();
  });

  it("lässt https-Blob-URLs unverändert", () => {
    expect(absoluteUrlForEmail("https://blob.vercel-storage.com/logo.png")).toBe(
      "https://blob.vercel-storage.com/logo.png",
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
