import { serializeJsonLd } from "@/lib/site/json-ld";

/** Rendert ein JSON-LD-Script; `null`/`undefined` → nichts. */
export function JsonLdScript({ data }: { data: unknown | null | undefined }) {
  if (data == null) return null;
  const safeJson = serializeJsonLd(data);
  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {safeJson}
    </script>
  );
}
