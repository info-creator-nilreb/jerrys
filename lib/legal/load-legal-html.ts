import fs from "node:fs";
import path from "node:path";

export type LegalSlug = "impressum" | "datenschutz" | "agb" | "widerruf" | "versand" | "rueckgabe";

function stripDuplicateHeading(html: string, slug: LegalSlug): string {
  const patterns: Record<LegalSlug, RegExp | null> = {
    impressum: /^<h2[^>]*>\s*Impressum\s*<\/h2>\s*<hr\s*\/?>/i,
    datenschutz: /^<h2[^>]*>\s*Datenschutz\s*<\/h2>\s*<hr\s*\/?>/i,
    agb: /^<h2[^>]*>\s*AGB\s*<\/h2>\s*<hr\s*\/?>/i,
    versand: /^<h2[^>]*>\s*Zahlung und Versand\s*<\/h2>\s*<hr\s*\/?>/i,
    rueckgabe: /^<h2[^>]*>\s*Rückgabe\s*<\/h2>\s*<hr\s*\/?>/i,
    widerruf: null,
  };
  const re = patterns[slug];
  if (!re) return html;
  return html.replace(re, "").trim();
}

/** Shopware-Pfade und http-Links auf die öffentliche Domain normalisieren. */
function normalizeLegalAssetLinks(html: string): string {
  return html
    .replace(/href="http:\/\/jerry-s\.com\/?"/gi, 'href="https://www.jerry-s.com/"')
    .replace(/href="\/service\//gi, 'href="https://www.jerry-s.com/service/')
    .replace(/href='\/service\//gi, "href='https://www.jerry-s.com/service/");
}

export function loadLegalHtmlRaw(slug: LegalSlug): string {
  const filePath = path.join(process.cwd(), "content", "legal", `${slug}.html`);
  const raw = fs.readFileSync(filePath, "utf8");
  return stripDuplicateHeading(normalizeLegalAssetLinks(raw), slug);
}
