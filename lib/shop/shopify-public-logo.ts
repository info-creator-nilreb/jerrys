/**
 * Logo-URL aus einer öffentlichen Shopify-Storefront (HTML).
 * Wird genutzt, wenn der Blob-Store für Branding 403 liefert.
 */
export function extractShopifyLogoUrlFromHtml(html: string, origin: string): string | null {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const push = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    let absolute = trimmed;
    if (trimmed.startsWith("//")) absolute = `https:${trimmed}`;
    else if (trimmed.startsWith("/")) {
      try {
        absolute = new URL(trimmed, origin).toString();
      } catch {
        return;
      }
    }
    if (!absolute.startsWith("https://")) return;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    candidates.push(absolute);
  };

  for (const m of html.matchAll(
    /https:\/\/cdn\.shopify\.com\/[^"'\s>]+\.(?:png|webp|svg|jpe?g)(?:\?[^"'\s>]*)?/gi,
  )) {
    push(m[0] ?? "");
  }
  for (const m of html.matchAll(/(?:src|href)=["']([^"']*logo[^"']+)["']/gi)) {
    push(m[1] ?? "");
  }

  const scored = candidates
    .map((url) => {
      const lower = url.toLowerCase();
      let score = 0;
      if (lower.includes("logo")) score += 5;
      if (lower.includes("transparent")) score += 2;
      if (lower.includes("edel") || lower.includes("weiss")) score += 1;
      if (lower.includes("cdn.shopify.com") || lower.includes("/cdn/shop/")) score += 2;
      if (lower.includes("social") || lower.includes("og-") || lower.includes("sharing")) score -= 4;
      return { url, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.url ?? null;
}
