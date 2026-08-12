/**
 * Serialisiert JSON-LD sicher für Einbettung in `<script type="application/ld+json">`.
 * Escaped `<`, damit String-Werte kein `</script>` injizieren können.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
