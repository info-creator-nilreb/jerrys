/**
 * Erste Adresszeile: keine vollständige Adressvalidierung (kein Meldeamt), nur grobe Plausibilität.
 */

/** Länder, in denen Zeile 1 üblicherweise Straße + Hausnummer enthält (mindestens eine Ziffer). */
const LINE1_EXPECT_HOUSE_NUMBER_DIGIT = new Set([
  "AT",
  "BE",
  "CH",
  "CZ",
  "DE",
  "DK",
  "ES",
  "FI",
  "FR",
  "IT",
  "LU",
  "NL",
  "PL",
  "PT",
  "SE",
  "SK",
]);

/** Hier kann Zeile 1 ohne Ziffer vorkommen (ländlich / Eircode); keine Ziffern-Heuristik. */
const LINE1_SKIP_HOUSE_NUMBER_DIGIT = new Set(["IE"]);

/**
 * @returns Fehlertext oder `null`, wenn keine zusätzliche Regel greift bzw. Zeile ok ist.
 */
export function addressLine1HouseNumberMessage(countryCode: string, line1: string): string | null {
  const cc = countryCode.trim().toUpperCase();
  const line = line1.trim();
  if (!line) return null;
  if (LINE1_SKIP_HOUSE_NUMBER_DIGIT.has(cc)) return null;
  if (!LINE1_EXPECT_HOUSE_NUMBER_DIGIT.has(cc)) return null;
  if (/\d/.test(line)) return null;
  return "Bitte Straße und Hausnummer angeben (die Zeile sollte auch eine Hausnummer enthalten).";
}
