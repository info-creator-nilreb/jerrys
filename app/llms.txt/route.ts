import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/**
 * Kurzinfo für KI-/Agent-Crawler (Epic 8 / Epic 14 Slice 4).
 * Nur kanonische öffentliche Ressourcen — keine personenbezogenen oder Admin-Daten.
 */
export async function GET() {
  const origin = (canonicalSiteOrigin() || "https://example.com").replace(
    /\/$/,
    "",
  );
  const body = [
    "# jerry's – Katzenmöbel",
    "",
    `Website: ${origin}/`,
    "",
    "## Kanonische öffentliche Ressourcen",
    "",
    `- Storefront (Startseite): ${origin}/`,
    `- Produktkatalog (HTML): ${origin}/produkte`,
    `- Kategorien (HTML): ${origin}/kategorien`,
    `- Maschinenlesbarer Produktfeed (JSON): ${origin}/katalog.json`,
    `- Sitemap: ${origin}/sitemap.xml`,
    `- robots.txt: ${origin}/robots.txt`,
    "",
    "## Rechtliches",
    "",
    `- Impressum: ${origin}/impressum`,
    `- Datenschutz: ${origin}/datenschutz`,
    `- AGB: ${origin}/agb`,
    `- Widerruf: ${origin}/widerruf`,
    `- Rückgabe: ${origin}/rueckgabe`,
    `- Versand: ${origin}/versand`,
    "",
    "## Grenzen für Agenten (v1)",
    "",
    "Erlaubt: lesende Discoverability (HTML-Katalog, JSON-Feed, Sitemap, strukturierte Daten).",
    "Nicht erlaubt / nicht öffentlich indexierbar: Admin (`/admin`), APIs unter `/api/`,",
    "Warenkorb, Checkout, Kundenkonto und alle schreibenden Aktionen.",
    "Der Produktfeed ist keine Preis- oder Bestandsreservierung; autoritative Preise und",
    "Verfügbarkeit kommen aus den Shopdaten (Feed und JSON-LD spiegeln nur öffentliche Angebote).",
    "",
    "Es werden keine personenbezogenen Datensätze, Lagermengen oder internen Admin-Felder",
    "über diese Datei oder den öffentlichen Feed bereitgestellt.",
    "",
    "Letzte Pflege: automatisch generiert aus kanonischen Storefront-Pfaden.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
