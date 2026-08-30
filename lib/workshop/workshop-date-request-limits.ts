/** Technisches Maximum pro Wunschtermin-Anfrage (serverseitig). */
export const WORKSHOP_DATE_REQUEST_MAX_SEATS = 50;

export const DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS = 3;
export const DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS = 12;

export type WorkshopDateRequestSeatGuidance = {
  typicalMinSeats: number;
  typicalMaxSeats: number;
  hint: string;
  placeholder: string;
};

export function buildWorkshopDateRequestSeatCountHint(
  typicalMinSeats: number,
  typicalMaxSeats: number,
): string {
  return (
    `Unsere Workshops finden meist mit ${typicalMinSeats}–${typicalMaxSeats} Personen statt. ` +
    `Größere Gruppen (bis ${WORKSHOP_DATE_REQUEST_MAX_SEATS} Plätze) sind möglich — kurz in der Nachricht ergänzen, falls nötig.`
  );
}

export function buildWorkshopDateRequestSeatCountPlaceholder(
  typicalMinSeats: number,
  typicalMaxSeats: number,
): string {
  const midpoint = Math.round((typicalMinSeats + typicalMaxSeats) / 2);
  return `z. B. ${midpoint}`;
}

export function workshopDateRequestSeatGuidance(
  typicalMinSeats: number,
  typicalMaxSeats: number,
): WorkshopDateRequestSeatGuidance {
  return {
    typicalMinSeats,
    typicalMaxSeats,
    hint: buildWorkshopDateRequestSeatCountHint(typicalMinSeats, typicalMaxSeats),
    placeholder: buildWorkshopDateRequestSeatCountPlaceholder(typicalMinSeats, typicalMaxSeats),
  };
}

export const DEFAULT_WORKSHOP_DATE_REQUEST_SEAT_GUIDANCE = workshopDateRequestSeatGuidance(
  DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS,
  DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS,
);
