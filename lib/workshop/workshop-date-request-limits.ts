/** Technisches Maximum pro Wunschtermin-Anfrage (serverseitig). */
export const WORKSHOP_DATE_REQUEST_MAX_SEATS = 50;

/** Typische Gruppengröße — nur UX-Hinweis, keine harte Validierung. */
export const WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS = 3;
export const WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS = 12;

export const WORKSHOP_DATE_REQUEST_SEAT_COUNT_HINT =
  `Unsere Workshops finden meist mit ${WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS}–${WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS} Personen statt. ` +
  `Größere Gruppen (bis ${WORKSHOP_DATE_REQUEST_MAX_SEATS} Plätze) sind möglich — kurz in der Nachricht ergänzen, falls nötig.`;

export const WORKSHOP_DATE_REQUEST_SEAT_COUNT_PLACEHOLDER = "z. B. 8";
