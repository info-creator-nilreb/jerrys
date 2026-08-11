import { describe, expect, it } from "vitest";
import {
  coerceResendFromFormat,
  resolveMailFromForResend,
  resolveTransactionalMailFrom,
  resendSafeDisplayName,
} from "@/lib/email/mail-from";

describe("resolveMailFromForResend", () => {
  it("wandelt RFC2047 aus .env.example in Resend-Format ohne Anführungszeichen", () => {
    const from = resolveMailFromForResend(
      '=?UTF-8?Q?jerry=27s?= <shop@example.com>',
    );
    expect(from).toBe("Jerrys <shop@example.com>");
  });

  it("sanitisiert unquoted Apostroph im Namen", () => {
    expect(resolveMailFromForResend("jerry's <shop@example.com>")).toBe(
      "Jerrys <shop@example.com>",
    );
  });

  it("akzeptiert einfaches Name <email>", () => {
    expect(resolveMailFromForResend("Shop <noreply@example.com>")).toBe(
      "Shop <noreply@example.com>",
    );
  });

  it("liefert nur E-Mail wenn kein Anzeigename", () => {
    expect(resolveMailFromForResend("noreply@example.com")).toBe("noreply@example.com");
  });

  it("entfernt äußere Anführungszeichen um den gesamten Wert (Vercel)", () => {
    expect(resolveMailFromForResend('"Jerrys <shop@example.com>"')).toBe(
      "Jerrys <shop@example.com>",
    );
  });

  it("liefert null bei ungültigem Wert", () => {
    expect(resolveMailFromForResend("")).toBeNull();
    expect(resolveMailFromForResend("not-an-email")).toBeNull();
  });
});

describe("resolveTransactionalMailFrom", () => {
  it("bevorzugt MAIL_FROM_EMAIL und MAIL_FROM_NAME", () => {
    const result = resolveTransactionalMailFrom({
      MAIL_FROM: "invalid",
      MAIL_FROM_EMAIL: "shop@example.com",
      MAIL_FROM_NAME: "jerry's",
    });
    expect(result.source).toBe("mail_from_email");
    expect(result.from).toBe("Jerrys <shop@example.com>");
  });

  it("lehnt MAIL_FROM ohne E-Mail-Adresse ab (nur Markenname)", () => {
    expect(resolveTransactionalMailFrom({ MAIL_FROM: "jerry's" })).toEqual({
      from: null,
      source: "none",
    });
  });

  it("nutzt displayNameFallback wenn MAIL_FROM_NAME fehlt", () => {
    const result = resolveTransactionalMailFrom(
      { MAIL_FROM_EMAIL: "shop@example.com" },
      { displayNameFallback: "jerry's" },
    );
    expect(result.from).toBe("Jerrys <shop@example.com>");
  });
});

describe("resendSafeDisplayName", () => {
  it("entfernt Sonderzeichen", () => {
    expect(resendSafeDisplayName("jerry's")).toBe("Jerrys");
  });
});
