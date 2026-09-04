import { afterEach, describe, expect, it } from "vitest";
import { getEmailIntegrationStatus } from "@/lib/email/email-integration-status";

describe("getEmailIntegrationStatus", () => {
  const prev = {
    key: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM,
    email: process.env.MAIL_FROM_EMAIL,
    name: process.env.MAIL_FROM_NAME,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries({
      RESEND_API_KEY: prev.key,
      MAIL_FROM: prev.from,
      MAIL_FROM_EMAIL: prev.email,
      MAIL_FROM_NAME: prev.name,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("ist nicht bereit ohne Key oder Absender", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    delete process.env.MAIL_FROM_EMAIL;
    delete process.env.MAIL_FROM_NAME;
    const status = getEmailIntegrationStatus();
    expect(status.ready).toBe(false);
    expect(status.apiKeyConfigured).toBe(false);
    expect(status.fromConfigured).toBe(false);
  });

  it("ist bereit mit Key und MAIL_FROM_EMAIL", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM_EMAIL = "info@edelweissdesigns.de";
    process.env.MAIL_FROM_NAME = "Edelweiss";
    delete process.env.MAIL_FROM;
    const status = getEmailIntegrationStatus();
    expect(status.ready).toBe(true);
    expect(status.from).toContain("info@edelweissdesigns.de");
    expect(status.source).toBe("mail_from_email");
  });
});
