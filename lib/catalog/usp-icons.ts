/**
 * Deterministische USP-Icons aus Text (keine KI).
 * Keyword-Heuristik + Fallback-Palette ohne Doppelungen in einer Zeile.
 */

export type UspIconName =
  | "paw"
  | "leaf"
  | "heart"
  | "shield"
  | "sparkles"
  | "gem"
  | "flag-de"
  | "tag";

export type UspIconFamily = "pet" | "jewelry" | "general";

/** Max. USPs auf PDP und in der Admin-Maske (1:1). */
export const MAX_PRODUCT_USPS = 3;

const FALLBACK_BY_FAMILY: Record<UspIconFamily, UspIconName[]> = {
  pet: ["paw", "leaf", "heart", "shield", "sparkles"],
  jewelry: ["gem", "sparkles", "heart", "leaf", "shield"],
  general: ["sparkles", "heart", "leaf", "shield", "tag"],
};

/** Heuristik: passendes Icon zum Claim-Text. */
export function iconForUspText(line: string, family: UspIconFamily = "general"): UspIconName {
  const t = line.toLowerCase();
  if (/made in germany|deutschland|germany|\bde\b/.test(t)) return "flag-de";
  if (/sicher|geborgen|schutz|rückzug|rutschfest/.test(t)) {
    return family === "pet" ? "paw" : "shield";
  }
  if (/stabil|langlebig|robust|haltbar|qualität/.test(t)) {
    return family === "pet" ? "paw" : "shield";
  }
  if (/pflege|abwisch|easy.?care|klima|nachhalt|öko|bio/.test(t)) return "leaf";
  if (/stil|zeitlos|design|schön|elegant|angenehm|geschlossen|form/.test(t)) return "heart";
  if (/handarbeit|handmade|made by|unikat/.test(t)) return "sparkles";
  if (family === "jewelry") return "gem";
  if (family === "pet") return "paw";
  return "sparkles";
}

/**
 * Wählt ein Icon und vermeidet Doppelungen innerhalb derselben USP-Zeile.
 */
export function pickDistinctUspIcon(
  line: string,
  family: UspIconFamily,
  used: ReadonlySet<UspIconName>,
): UspIconName {
  const preferred = iconForUspText(line, family);
  if (!used.has(preferred)) return preferred;
  for (const candidate of FALLBACK_BY_FAMILY[family]) {
    if (!used.has(candidate)) return candidate;
  }
  return preferred;
}
