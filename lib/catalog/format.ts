export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

/**
 * Währungsbetrag aus Cent; bei ganzzahligen Euro ohne Nachkommastellen (z. B. 100 € statt 100,00 €).
 */
export function formatPriceWholeEurosWhenInteger(cents: number, currency = "EUR"): string {
  const wholeEuro = cents % 100 === 0;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: wholeEuro ? 0 : 2,
    maximumFractionDigits: wholeEuro ? 0 : 2,
  }).format(cents / 100);
}

/** Für Preisfelder im Admin-Formular (de-DE). */
export function centsToPriceInputString(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Akzeptiert z. B. "79", "79,00", "79.5" und liefert Cent oder null. */
export function parseEuroInputToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
