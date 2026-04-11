import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/**
 * Kurzinfo für KI-/Agent-Crawler (Epic 8). Keine personenbezogenen Daten.
 * @see docs/DELIVERY_PLAN_PHASE2.md
 */
export async function GET() {
  const origin = canonicalSiteOrigin() || "https://example.com";
  const body = [
    "# jerry's – Katzenmöbel",
    "",
    `Website: ${origin}`,
    "",
    "Öffentliche Bereiche: Startseite, Produktkatalog, rechtliche Seiten (Impressum, Datenschutz, AGB, …).",
    "Admin und APIs sind nicht für die öffentliche Indexierung gedacht.",
    "",
    `Impressum: ${origin}/impressum`,
    `Datenschutz: ${origin}/datenschutz`,
    "",
    "Es werden keine öffentlichen personenbezogenen Datensätze über diese Datei bereitgestellt.",
    "",
    "Letzte inhaltliche Pflege: automatisch generiert; Inhaber bitte Text anpassen.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
