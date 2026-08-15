/** Token aus Query/Form (URL-decode, trim). Client-sicher, kein node:crypto. */
export function normalizeCustomerAuthTokenFromClient(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}
