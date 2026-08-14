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

  it("liefert Merchant-Datei wenn kein Env-Override gesetzt ist", async () => {
    delete process.env.APPLE_PAY_DOMAIN_ASSOCIATION;
    process.env.PAYPAL_ENV = "live";
    const { applePayDomainAssociationBody } = await import(
      "@/lib/payments/apple-pay-domain-association"
    );
    const body = applePayDomainAssociationBody();
    expect(body.length).toBeGreaterThan(100);
    // Vom Händler hinterlegte Registrierungsdatei (PayPal-Download)
    expect(body.slice(0, 20)).toBe("7B227073704964223A22");
  });
});
