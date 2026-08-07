"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  devBaseUrl: string;
};

/**
 * Warnt, wenn der Next.js-Dev-Client nicht geladen ist (kein nextjs-portal / kein „N“).
 * Typisch in sandboxed Cursor-Previews: Origin null → blockierte `/_next`-Requests.
 */
export function AdminDevClientNotice({ devBaseUrl }: Props) {
  const [inIframe, setInIframe] = useState(false);
  const [clientMissing, setClientMissing] = useState(false);

  useEffect(() => {
    setInIframe(window.self !== window.top);
    const timer = window.setTimeout(() => {
      const portal = document.querySelector("nextjs-portal");
      if (!portal) {
        setClientMissing(true);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!inIframe && !clientMissing) {
    return null;
  }

  const adminUrl = `${devBaseUrl.replace(/\/$/, "")}/admin`;

  return (
    <div
      className="mb-4 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">
          {clientMissing
            ? "Next.js-Client nicht aktiv (kein „N“ unten rechts)"
            : "Eingebettete Vorschau — Client-Aktionen können ausfallen"}
        </p>
        <p className="leading-relaxed text-amber-900/90">
          In eingebetteten Vorschauen blockiert Next.js oft Dev-Skripte — Klicks auf Bestellungen, Status-Dropdowns
          und Server Actions reagieren dann nicht. Terminal prüfen auf „Blocked cross-origin request to Next.js dev
          resource“.
        </p>
        <p className="leading-relaxed">
          <strong>Lösung:</strong> Dev-Server mit{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">npm run dev:cloud</code>, dann Admin in einem{" "}
          <strong>normalen Browser-Tab</strong> öffnen:{" "}
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {adminUrl}
          </a>
          . Alternativ Port 3001 → Globus in Cursor, URL muss{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">http://localhost:3001</code> sein (http, nicht https).
        </p>
      </div>
    </div>
  );
}
