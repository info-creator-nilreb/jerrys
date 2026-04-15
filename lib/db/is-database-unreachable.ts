/**
 * Prisma P1001 / typische pg-Fehler, wenn der DB-Host nicht erreichbar ist
 * (Supabase pausiert, falsche URL, VPN/Firewall, DNS).
 */
export function isDatabaseUnreachable(e: unknown): boolean {
  if (e == null || typeof e !== "object") return false;
  const o = e as { code?: unknown; message?: unknown };
  if (o.code === "P1001") return true;
  if (typeof o.message !== "string") return false;
  const m = o.message;
  if (/Can't reach database server/i.test(m)) return true;
  if (/connection.*refused/i.test(m)) return true;
  if (/getaddrinfo/i.test(m)) return true;
  return false;
}
