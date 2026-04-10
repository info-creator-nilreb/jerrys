import type { PoolConfig } from "pg";

/**
 * Bei Änderungen an URL- oder SSL-Handling erhöhen, damit der Dev-Pool-Cache in
 * `getPrisma()` verworfen wird (sonst bleibt z. B. eine alte URL mit `sslmode` aktiv).
 */
export const PG_POOL_CONFIG_VERSION = 2;

const SSL_QUERY_KEYS = [
  "sslmode",
  "ssl",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "uselibpqcompat",
] as const;

/**
 * Entfernt SSL-bezogene Query-Parameter aus der Postgres-URL.
 *
 * `pg` macht `Object.assign({}, poolConfig, parse(connectionString))` – damit überschreiben
 * Werte aus der URL (z. B. `sslmode=require`) ein explizites `ssl: { rejectUnauthorized: false }`.
 * Zusätzlich behandelt `pg-connection-string` `require`/`prefer` aktuell wie `verify-full`,
 * was bei vielen Hostern zu „self-signed certificate in certificate chain“ führt.
 */
export function stripSslParamsFromDatabaseUrl(connectionString: string): string {
  try {
    const proto = /^postgresql:/i.test(connectionString) ? "postgresql:" : "postgres:";
    const url = new URL(connectionString.replace(/^postgres(ql)?:/i, "http:"));

    for (const key of SSL_QUERY_KEYS) {
      url.searchParams.delete(key);
    }

    return url.toString().replace(/^http:/, proto);
  } catch {
    return connectionString;
  }
}

/**
 * Ob Zertifikate nicht gegen die System-CAs geprüft werden (nur Verbindung verschlüsselt).
 * - `DATABASE_SSL_REJECT_UNAUTHORIZED=true` → immer strikt (auch in development).
 * - `DATABASE_SSL_REJECT_UNAUTHORIZED=false` → immer relaxed.
 * - Sonst: in development relaxed, in production strikt.
 */
export function pgUsesRelaxedSsl(): boolean {
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true") return false;
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * Lokales Postgres ohne `sslmode` nutzt meist kein TLS – dann kein `ssl`-Objekt setzen,
 * sonst kann `pg` TLS anfragen und die Verbindung bricht.
 * Remote-Hosts (z. B. Supabase) fast immer TLS → relaxed Verify, wenn {@link pgUsesRelaxedSsl}.
 */
function connectionUsesTlsForRelaxPath(connectionString: string): boolean {
  try {
    const url = new URL(connectionString.replace(/^postgres(ql)?:/i, "http:"));
    const host = url.hostname.toLowerCase();
    const mode = url.searchParams.get("sslmode")?.toLowerCase() ?? "";

    if (mode === "disable") return false;

    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (isLocal && !mode) return false;

    return true;
  } catch {
    return true;
  }
}

/**
 * Baut die Pool-Konfiguration für `pg` + Prisma-Adapter.
 * Behebt typische Fehler wie „self-signed certificate in certificate chain“ bei gehosteten DBs.
 */
export function createPgPoolConfig(connectionString: string): PoolConfig {
  if (pgUsesRelaxedSsl() && connectionUsesTlsForRelaxPath(connectionString)) {
    return {
      connectionString: stripSslParamsFromDatabaseUrl(connectionString),
      ssl: { rejectUnauthorized: false },
    };
  }

  return { connectionString };
}
