import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY_BASE } from "@/lib/site/content-security-policy";

describe("CONTENT_SECURITY_POLICY_BASE", () => {
  it("enthält harte Grundlagen und PayPal", () => {
    expect(CONTENT_SECURITY_POLICY_BASE).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY_BASE).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY_BASE).toContain("https://www.paypal.com");
    expect(CONTENT_SECURITY_POLICY_BASE).toContain("https://*.supabase.co");
  });
});
