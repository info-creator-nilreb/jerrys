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

function collectErrorMessages(e: unknown, depth = 0): string[] {
  if (depth > 4 || e == null) return [];
  const out: string[] = [];
  if (typeof e === "string") {
    out.push(e);
    return out;
  }
  if (typeof e !== "object") return out;
  const o = e as { message?: unknown; cause?: unknown };
  if (typeof o.message === "string") out.push(o.message);
  if (o.cause !== undefined) out.push(...collectErrorMessages(o.cause, depth + 1));
  return out;
}

/** Pool voll / Session-Limit (typisch Supabase beim parallelen `next build`). */
export function isDatabaseCapacityLimited(e: unknown): boolean {
  const text = collectErrorMessages(e).join(" ");
  if (!text) return false;
  return (
    /EMAXCONNSESSION/i.test(text) ||
    /max clients reached/i.test(text) ||
    /too many (clients|connections)/i.test(text)
  );
}

/** Sitemap & Co.: lieber statische URLs als Build-Abbruch. */
export function shouldSkipSitemapDatabase(e: unknown): boolean {
  return isDatabaseUnreachable(e) || isDatabaseCapacityLimited(e);
}

export function isNextProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}
