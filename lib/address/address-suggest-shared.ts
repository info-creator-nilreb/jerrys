/** Client-sichere Konstanten/Typen für die Adressunterstützung (kein Server-Import). */

/** Maximal angezeigte Vorschläge pro Feld. */
export const ADDRESS_SUGGEST_LIMIT = 5;

export const ADDRESS_SUGGEST_DEBOUNCE_MS = 250;

/** Ab wie vielen Zeichen die Straßensuche startet. */
export const ADDRESS_SUGGEST_STREET_MIN_LENGTH = 2;

/** Ab wie vielen Zeichen die PLZ-Suche startet (Präfix-Suche der Datenquelle). */
export const ADDRESS_SUGGEST_ZIP_MIN_LENGTH = 3;

/**
 * Länder mit amtlicher Datengrundlage (OpenPLZ API).
 * Für alle anderen Länder bleiben die Felder normale Freitextfelder.
 */
export const ADDRESS_SUGGEST_COUNTRIES = ["DE", "AT", "CH", "LI"] as const;

export type AddressSuggestCountry = (typeof ADDRESS_SUGGEST_COUNTRIES)[number];

export function isAddressSuggestCountry(countryCode: string): countryCode is AddressSuggestCountry {
  return (ADDRESS_SUGGEST_COUNTRIES as readonly string[]).includes(
    countryCode.trim().toUpperCase(),
  );
}

export type AddressLocalitySuggestion = {
  postalCode: string;
  city: string;
};

export type AddressStreetSuggestion = {
  street: string;
  postalCode: string;
  city: string;
};

export type AddressSuggestResponse = {
  localities: AddressLocalitySuggestion[];
  streets: AddressStreetSuggestion[];
};
