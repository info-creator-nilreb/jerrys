import { afterEach, describe, expect, it, vi } from "vitest";

describe("applePayDomainAssociationBody", () => {
  const prevEnv = process.env.PAYPAL_ENV;
  const prevOverride = process.env.APPLE_PAY_DOMAIN_ASSOCIATION;

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.PAYPAL_ENV;
    else process.env.PAYPAL_ENV = prevEnv;
    if (prevOverride === undefined) delete process.env.APPLE_PAY_DOMAIN_ASSOCIATION;
    else process.env.APPLE_PAY_DOMAIN_ASSOCIATION = prevOverride;
    vi.resetModules();
  });

  it("liefert Override aus APPLE_PAY_DOMAIN_ASSOCIATION", async () => {
    process.env.APPLE_PAY_DOMAIN_ASSOCIATION = "override-body";
    const { applePayDomainAssociationBody } = await import(
      "@/lib/payments/apple-pay-domain-association"
    );
    expect(applePayDomainAssociationBody()).toBe("override-body");
  });

  it("liefert unterschiedliche Dateien für sandbox und live", async () => {
    delete process.env.APPLE_PAY_DOMAIN_ASSOCIATION;
    process.env.PAYPAL_ENV = "sandbox";
    vi.resetModules();
    const sandboxMod = await import("@/lib/payments/apple-pay-domain-association");
    const sandbox = sandboxMod.applePayDomainAssociationBody();

    process.env.PAYPAL_ENV = "live";
    vi.resetModules();
    const liveMod = await import("@/lib/payments/apple-pay-domain-association");
    const live = liveMod.applePayDomainAssociationBody();

    expect(sandbox.length).toBeGreaterThan(100);
    expect(live.length).toBeGreaterThan(100);
    expect(sandbox).not.toBe(live);
  });
});
