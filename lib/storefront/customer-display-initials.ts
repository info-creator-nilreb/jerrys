/** Kurzinitialen für Avatar (Name bevorzugt, sonst E-Mail). */
export function customerDisplayInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
    }
    return trimmedName.slice(0, 2).toUpperCase();
  }
  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    return trimmedEmail.slice(0, 2).toUpperCase();
  }
  return "?";
}
