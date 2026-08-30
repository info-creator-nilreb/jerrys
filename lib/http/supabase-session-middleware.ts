/**
 * Supabase Auth wird im Shop nicht für Kunden/Admin genutzt (NextAuth).
 * Session-Refresh in der Edge-Middleware spart einen Netzwerk-Roundtrip pro Navigation.
 */
export function shouldRefreshSupabaseSessionInMiddleware(_pathname: string): boolean {
  return false;
}
