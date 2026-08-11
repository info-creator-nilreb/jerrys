/**
 * Ungültiger/unbekannter Block: in Production unsichtbar,
 * in Development kurzer Hinweis für Editor-Debugging.
 */
export function ContentBlockFallback({
  blockId,
  type,
  reason,
}: {
  blockId: string;
  type: string;
  reason: "unknown_type" | "invalid_data";
}) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return (
    <aside
      className="mx-auto my-4 max-w-6xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      data-content-block-id={blockId}
      data-content-block-fallback={reason}
    >
      CMS-Block übersprungen: <code>{type}</code> ({reason})
    </aside>
  );
}
