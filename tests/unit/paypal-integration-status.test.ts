import { afterEach, describe, expect, it } from "vitest";
import {
  getPayPalIntegrationStatus,
  maskPayPalId,
} from "@/lib/payments/paypal-integration-status";

describe("maskPayPalId", () => {
  it("maskiert lange IDs", () => {
    expect(maskPayPalId("AaBbCcDdEeFf123456")).toBe("AaBb…3456");
  });

  it("kürzere IDs komplett maskiert", () => {
    expect(maskPayPalId("abc")).toBe("••••");
  });
});

describe("getPayPalIntegrationStatus", () => {
  const prev = {
    id: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_CLIENT_SECRET,
    env: process.env.PAYPAL_ENV,
    webhook: process.env.PAYPAL_WEBHOOK_ID,
    site: process.env.NEXT_PUBLIC_SITE_URL,
    sepa: process.env.PAYPAL_SEPA_DEBIT_ENABLED,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries({
      PAYPAL_CLIENT_ID: prev.id,
      PAYPAL_CLIENT_SECRET: prev.secret,
      PAYPAL_ENV: prev.env,
      PAYPAL_WEBHOOK_ID: prev.webhook,
      NEXT_PUBLIC_SITE_URL: prev.site,
      PAYPAL_SEPA_DEBIT_ENABLED: prev.sepa,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("meldet fehlende Credentials", () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_WEBHOOK_ID;
    delete process.env.PAYPAL_ENV;
    process.env.NEXT_PUBLIC_SITE_URL = "https://edelweissdesigns.de";
    const status = getPayPalIntegrationStatus();
    expect(status.credentialsConfigured).toBe(false);
    expect(status.readyForLive).toBe(false);
    expect(status.env).toBe("sandbox");
    expect(status.webhookUrl).toBe("https://edelweissdesigns.de/api/webhooks/paypal");
    expect(status.clientIdMasked).toBeNull();
  });

  it("ist live-bereit nur mit Credentials, Webhook und PAYPAL_ENV=live", () => {
    process.env.PAYPAL_CLIENT_ID = "Aaaaaaaaaaaaaaaaaaaa";
    process.env.PAYPAL_CLIENT_SECRET = "secret";
    process.env.PAYPAL_ENV = "live";
    process.env.PAYPAL_WEBHOOK_ID = "WH-ABCDEFGHIJKLMNOP";
    process.env.NEXT_PUBLIC_SITE_URL = "https://edelweissdesigns.de";
    const status = getPayPalIntegrationStatus();
    expect(status.credentialsConfigured).toBe(true);
    expect(status.webhookConfigured).toBe(true);
    expect(status.readyForLive).toBe(true);
    expect(status.env).toBe("live");
    expect(status.clientIdMasked).toBe("Aaaa…aaaa");
    expect(status.webhookIdMasked).toBe("WH-A…MNOP");
  });

  it("bleibt ohne Webhook nicht live-bereit", () => {
    process.env.PAYPAL_CLIENT_ID = "Aaaaaaaaaaaaaaaaaaaa";
    process.env.PAYPAL_CLIENT_SECRET = "secret";
    process.env.PAYPAL_ENV = "live";
    delete process.env.PAYPAL_WEBHOOK_ID;
    const status = getPayPalIntegrationStatus();
    expect(status.credentialsConfigured).toBe(true);
    expect(status.readyForLive).toBe(false);
  });
});
