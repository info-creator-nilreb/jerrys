import { describe, expect, it } from "vitest";
import {
  resolveMailFromForResend,
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

  it("liefert null bei ungültigem Wert", () => {
    expect(resolveMailFromForResend("")).toBeNull();
    expect(resolveMailFromForResend("not-an-email")).toBeNull();
  });
});

describe("resendSafeDisplayName", () => {
  it("entfernt Sonderzeichen", () => {
    expect(resendSafeDisplayName("jerry's")).toBe("Jerrys");
  });
});
