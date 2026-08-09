import { describe, expect, it } from "vitest";
import { resolveMailFromForResend } from "@/lib/email/mail-from";

describe("resolveMailFromForResend", () => {
  it("wandelt RFC2047 aus .env.example in Resend-taugliches Format", () => {
    const from = resolveMailFromForResend(
      '=?UTF-8?Q?jerry=27s?= <shop@example.com>',
    );
    expect(from).toBe('"jerry\'s" <shop@example.com>');
  });

  it("akzeptiert einfaches Name <email>", () => {
    expect(resolveMailFromForResend("Shop <noreply@example.com>")).toBe(
      "Shop <noreply@example.com>",
    );
  });

  it("wrappt reine E-Mail-Adresse", () => {
    expect(resolveMailFromForResend("noreply@example.com")).toBe(
      '"jerry\'s" <noreply@example.com>',
    );
  });

  it("liefert null bei leerem Wert", () => {
    expect(resolveMailFromForResend("")).toBeNull();
    expect(resolveMailFromForResend(undefined)).toBeNull();
  });
});
