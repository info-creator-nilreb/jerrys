/**
 * Hinweis bei fehlender DB-Verbindung (Supabase / DATABASE_URL).
 * Reiner Inhalt ohne Client-State.
 */
export function DatabaseUnavailableNotice() {
  return (
    <div
      role="status"
      className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950 md:px-5 md:py-5"
    >
      <p className="font-medium text-amber-950">Datenbank vorübergehend nicht erreichbar</p>
      <p className="mt-2 text-amber-950/95">
        Der Shop konnte keine Verbindung zum Datenbank-Server herstellen (z.&nbsp;B.{" "}
        <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">db.*.supabase.co</code> oder
        Session-Pooler).
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-amber-950/95">
        <li>Internetverbindung und VPN prüfen</li>
        <li>
          Im Supabase-Dashboard: Projekt nicht pausiert? Unter{" "}
          <strong>Project Settings → Database</strong> die Verbindungs-URL prüfen
        </li>
        <li>
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">DATABASE_URL</code> in{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">.env</code> mit der aktuellen
          URI abgleichen (Direktverbindung oder Session Pooler)
        </li>
      </ul>
    </div>
  );
}
