/**
 * Prisma P1001 / typische pg-Fehler, wenn der DB-Host nicht erreichbar ist
 * (Supabase pausiert, falsche URL, VPN/Firewall, DNS).
 */
export function isDatabaseUnreachable(e: unknown): boolean {
  if (e == null || typeof e !== "object") return false;
  const o = e as { code?: unknown; message?: unknown; cause?: unknown };
  if (o.code === "P1001") return true;
  if (typeof o.message === "string" && matchesUnreachableMessage(o.message)) return true;
  if (o.cause != null && typeof o.cause === "object") {
    const c = o.cause as { message?: unknown; originalMessage?: unknown };
    if (typeof c.message === "string" && matchesUnreachableMessage(c.message)) return true;
    if (typeof c.originalMessage === "string" && matchesUnreachableMessage(c.originalMessage)) {
      return true;
    }
  }
  return false;
}

/** Session-Pooler voll (z. B. Supabase EMAXCONNSESSION) — Storefront kann ohne DB-Extras rendern. */
export function isDatabaseCapacityError(e: unknown): boolean {
  if (e == null || typeof e !== "object") return false;
  const o = e as { message?: unknown; cause?: unknown };
  if (typeof o.message === "string" && matchesCapacityMessage(o.message)) return true;
  if (o.cause != null && typeof o.cause === "object") {
    const c = o.cause as { message?: unknown; originalMessage?: unknown };
    if (typeof c.message === "string" && matchesCapacityMessage(c.message)) return true;
    if (typeof c.originalMessage === "string" && matchesCapacityMessage(c.originalMessage)) {
      return true;
    }
  }
  return false;
}

/** Fehler, bei denen die Storefront mit reduziertem Inhalt weiterlaufen darf. */
export function isStorefrontDatabaseDegraded(e: unknown): boolean {
  return isDatabaseUnreachable(e) || isDatabaseCapacityError(e);
}

function matchesUnreachableMessage(m: string): boolean {
  if (/Can't reach database server/i.test(m)) return true;
  if (/connection.*refused/i.test(m)) return true;
  if (/getaddrinfo/i.test(m)) return true;
  return false;
}

function matchesCapacityMessage(m: string): boolean {
  if (/EMAXCONNSESSION/i.test(m)) return true;
  if (/max clients reached/i.test(m)) return true;
  if (/too many clients/i.test(m)) return true;
  return false;
}
