/**
 * Adresstexte vereinheitlichen: Rand-Whitespace entfernen und Mehrfach-Leerzeichen
 * (auch NBSP/Tab) zu einem Leerzeichen zusammenfassen.
 *
 * Nötig, weil Adressvorschläge den Straßennamen mit Trennleerzeichen einsetzen und Nutzer
 * die Hausnummer anfügen — sonst landet z. B. „Invalidenstr.  12“ im Bestell-Snapshot.
 */
export function normalizeAddressText(value: string): string {
  return value.replace(/[\s\u00a0]+/g, " ").trim();
}
