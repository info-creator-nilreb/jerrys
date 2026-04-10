/** Netto aus Brutto (Cent), Steuersatz in Prozent (z. B. 19). */
export function netCentsFromGross(grossCents: number, taxPercent: number): number {
  const factor = 1 + taxPercent / 100;
  return Math.round(grossCents / factor);
}

/** Brutto aus Netto (Cent). */
export function grossCentsFromNet(netCents: number, taxPercent: number): number {
  const factor = 1 + taxPercent / 100;
  return Math.round(netCents * factor);
}

export function centsPairMatchesTax(
  grossCents: number,
  netCents: number,
  taxPercent: number,
  tolerance = 1,
): boolean {
  const expected = netCentsFromGross(grossCents, taxPercent);
  return Math.abs(expected - netCents) <= tolerance;
}
