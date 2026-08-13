/**
 * Erkennt, ob die HTML-Beschreibung inhaltlich der Kurzbeschreibung entspricht
 * (dann nur einmal auf der PDP zeigen).
 */

export function plainTextFromProductHtml(html: string | null | undefined): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/[„“”"'`]/g, "")
    .replace(/[.!?,;:…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(text.split(/\s+/).filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * true = Beschreibung nicht zusätzlich rendern (redundant zur Kurzbeschreibung).
 */
export function isProductDescriptionRedundantWithLead(
  descriptionHtml: string | null | undefined,
  leadText: string | null | undefined,
): boolean {
  const plain = normalizeForCompare(plainTextFromProductHtml(descriptionHtml));
  const lead = normalizeForCompare(leadText ?? "");
  if (!plain || !lead) return false;
  if (plain === lead) return true;
  if (plain.includes(lead) && lead.length / plain.length >= 0.7) return true;
  if (lead.includes(plain) && plain.length / lead.length >= 0.7) return true;
  // Leichte Umformulierungen (gleiche Kernaussage, andere Schlussworte)
  return jaccard(tokenSet(plain), tokenSet(lead)) >= 0.65;
}
