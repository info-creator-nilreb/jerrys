/**
 * Grobe PLZ-/Postleitzahl-Prüfung je Land (Checkout + gleiche Regeln clientseitig).
 * Keine vollständige Zustellgarantie; reduziert offensichtliche Tippfehler.
 */
export function postalCodeErrorMessage(countryCode: string, rawZip: string): string | null {
  const zip = rawZip.trim();
  const cc = countryCode.trim().toUpperCase();
  if (!zip) return "Postleitzahl erforderlich.";

  switch (cc) {
    case "DE":
      return /^\d{5}$/.test(zip) ? null : "Postleitzahl: 5 Ziffern (Deutschland).";
    case "AT":
    case "BE":
    case "DK":
    case "FI":
    case "LU":
    case "PT":
      return /^\d{4}$/.test(zip) ? null : "Postleitzahl: 4 Ziffern.";
    case "CH":
      return /^\d{4}$/.test(zip) ? null : "Postleitzahl: 4 Ziffern (Schweiz).";
    case "FR":
    case "IT":
    case "ES":
      return /^\d{5}$/.test(zip) ? null : "Postleitzahl: 5 Ziffern.";
    case "NL": {
      const n = zip.replace(/\s+/g, "");
      return /^\d{4}[A-Za-z]{2}$/.test(n) ? null : "Postleitzahl: 1234 AB (Niederlande).";
    }
    case "PL":
      return /^\d{2}-\d{3}$/.test(zip) || /^\d{5}$/.test(zip)
        ? null
        : "Postleitzahl: 00-000 oder 5 Ziffern (Polen).";
    case "SE":
      return /^\d{3}\s?\d{2}$/.test(zip) ? null : "Postleitzahl: 123 45 (Schweden).";
    case "IE":
      return /^[A-Za-z0-9]{3}\s?[A-Za-z0-9]{4}$/.test(zip) || /^[A-Za-z][0-9]{2}\s?[A-Za-z0-9]{4}$/.test(zip)
        ? null
        : "Eircode / Postleitzahl prüfen (Irland).";
    default:
      return zip.length >= 2 && zip.length <= 12 ? null : "Postleitzahl prüfen.";
  }
}
