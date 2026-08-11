/** Client-sichere deutsche Datumsformatierung (kein Server-/E-Mail-Import). */
export function formatGermanDateMedium(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
