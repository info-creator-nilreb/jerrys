import { escapeHtmlForEmail } from "@/lib/email/template-utils";

const bodyColor = "#777777";
const mutedColor = "#cccccc";
const font = "Arial,Helvetica,sans-serif";

/** Begrüßungszeile für Konto-Mails; leer wenn kein Vorname. */
export function customerGreetingHtml(firstName: string | null | undefined): string {
  const name = firstName?.trim();
  if (!name) return "";
  return `<p style="margin:0 0 11px;font-family:${font};font-size:15px;line-height:1.55;color:${bodyColor};text-align:center">Hallo ${escapeHtmlForEmail(name)},</p>`;
}

/** Hinweis unter dem CTA-Button (Passwort zurücksetzen). */
export function authAfterButtonNoteHtml(
  text = "Solltest du diese E-Mail irrtümlich erhalten haben, kannst du diese ignorieren.",
): string {
  return `<p style="margin:16px 0 0;font-family:${font};font-size:13px;line-height:1.55;color:${mutedColor};text-align:center">${escapeHtmlForEmail(text)}</p>`;
}
