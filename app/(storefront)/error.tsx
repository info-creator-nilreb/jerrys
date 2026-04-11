"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("storefront.error");

function isDatabaseUnreachable(message: string): boolean {
  return (
    /Can't reach database server/i.test(message) ||
    /\bP1001\b/.test(message) ||
    /connection.*refused/i.test(message) ||
    /getaddrinfo/i.test(message)
  );
}

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("route_error_boundary", {
      digest: error.digest,
      ...errorMeta(error),
    });
  }, [error]);

  const db = isDatabaseUnreachable(error.message ?? "");

  return (
    <div className="mx-auto max-w-xl px-4 py-24 md:py-32">
      <h1 className="text-xl font-semibold text-(--foreground-heading) md:text-2xl">
        {db ? "Datenbank vorübergehend nicht erreichbar" : "Etwas ist schiefgelaufen"}
      </h1>
      {db ? (
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--foreground-body)">
          <p>
            Der Shop konnte keine Verbindung zum Datenbank-Server herstellen (z. B.{" "}
            <code className="rounded bg-(--surface-muted) px-1 py-0.5 text-xs">pooler.supabase.com</code>
            ).
          </p>
          <ul className="list-inside list-disc space-y-1 text-(--foreground-body)">
            <li>Internetverbindung und VPN prüfen</li>
            <li>
              Im Supabase-Dashboard: Projekt nicht pausiert? Unter{" "}
              <strong>Project Settings → Database</strong> die Verbindungs-URL prüfen
            </li>
            <li>
              <code className="rounded bg-(--surface-muted) px-1 py-0.5 text-xs">DATABASE_URL</code> in{" "}
              <code className="rounded bg-(--surface-muted) px-1 py-0.5 text-xs">.env</code> mit der aktuellen
              Pooler-/Direct-URL abgleichen
            </li>
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-(--foreground-body)">{error.message || "Unbekannter Fehler."}</p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover)"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-(--surface-muted) px-4 py-2.5 text-sm font-medium text-(--foreground-heading) hover:bg-(--surface-muted)"
        >
          Zur Startseite
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && error.digest ? (
        <p className="mt-8 font-mono text-xs text-[#9ca3af]">digest: {error.digest}</p>
      ) : null}
    </div>
  );
}
