/**
 * Bereitet HTML für die Admin-Vorschau vor:
 * - `/branding/…`-Assets auf die aktuelle Origin umschreiben (Preview-Deploys)
 * - `<base href>` setzen, damit relative URLs greifen
 */
export function prepareEmailPreviewHtml(html: string, assetOrigin: string): string {
  const origin = assetOrigin.trim().replace(/\/$/, "");
  if (!origin || !html) return html;

  let out = html.replace(
    /https?:\/\/[^"'>\s]+(\/branding\/[^"'>\s]*)/gi,
    `${origin}$1`,
  );

  if (/<base\s/i.test(out)) {
    out = out.replace(/<base\s[^>]*>/i, `<base href="${origin}/"/>`);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${origin}/"/>`);
  } else {
    out = `<!DOCTYPE html><html><head><meta charset="utf-8"/><base href="${origin}/"/></head><body>${out}</body></html>`;
  }

  return out;
}
