import { describe, expect, it } from "vitest";
import {
  authAfterButtonNoteHtml,
  customerGreetingHtml,
} from "@/lib/email/templates/auth-email-fragments";
import { buildPasswordResetOrderlyHtml } from "@/lib/email/templates/auth-email-orderly-html";
import { getEmailTemplateDefault } from "@/lib/email/templates/defaults";

describe("password reset orderly html", () => {
  it("enthält Orderly-Struktur und alle Pflicht-Platzhalter", () => {
    const html = buildPasswordResetOrderlyHtml();
    expect(html).toContain("Dein Passwort zurücksetzen");
    expect(html).toContain("{{{shop.logo_html}}}");
    expect(html).toContain("{{{customer.greeting_html}}}");
    expect(html).toContain("{{{email.cta_html}}}");
    expect(html).toContain("{{{email.after_button_note_html}}}");
    expect(html).toContain("{{{shop.footer_html}}}");
    expect(html).toContain("Passwort für dein Konto zurückgesetzt wird");
  });

  it("rendert Begrüßung und Hinweis-Fragmente", () => {
    expect(customerGreetingHtml("Alex")).toContain("Hallo Alex,");
    expect(customerGreetingHtml(null)).toBe("");
    expect(authAfterButtonNoteHtml()).toContain("irrtümlich erhalten");
  });

  it("ist Default für password_reset", () => {
    const d = getEmailTemplateDefault("password_reset");
    expect(d.htmlBody).toContain("Dein Passwort zurücksetzen");
    expect(d.textBody).toContain("irrtümlich erhalten");
  });
});
