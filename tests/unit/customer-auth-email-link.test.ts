import { describe, expect, it, vi } from "vitest";
import { customerAuthEmailActionUrl } from "@/lib/email/customer-auth-email-link";

describe("customerAuthEmailActionUrl", () => {
  it("setzt Verifizierungs-Token ins URL-Fragment", () => {
    vi.stubEnv("AUTH_URL", "https://shop.example.com");
    const url = customerAuthEmailActionUrl("/konto/verifizieren", "abc+def/xyz", {
      tokenInHash: true,
    });
    expect(url).toBe("https://shop.example.com/konto/verifizieren#token=abc%2Bdef%2Fxyz");
    vi.unstubAllEnvs();
  });

  it("setzt Magic-Link-Token in Query", () => {
    vi.stubEnv("AUTH_URL", "https://shop.example.com");
    const url = customerAuthEmailActionUrl("/konto/magic-link", "tok", {
      tokenInHash: false,
    });
    expect(url).toBe("https://shop.example.com/konto/magic-link?token=tok");
    vi.unstubAllEnvs();
  });
});
