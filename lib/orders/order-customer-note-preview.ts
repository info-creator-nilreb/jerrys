/** Kurz-Vorschau für Admin-Listen (eine Zeile). */
export function orderCustomerNotePreview(note: string | null | undefined, maxLen = 48): string | null {
  if (!note?.trim()) return null;
  const trimmed = note.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}
