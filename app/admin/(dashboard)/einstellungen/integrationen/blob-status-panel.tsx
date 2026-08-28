import { Images } from "lucide-react";
import { IntegrationStatusPill } from "./integration-status-pill";

export function BlobStatusPanel({ configured }: { configured: boolean }) {
  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Images className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#1f2937]">Medien (Vercel Blob)</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Logos, Produktbilder und OG-Uploads. Jedes Vercel-Projekt braucht einen eigenen{" "}
            <code className="text-[11px]">BLOB_READ_WRITE_TOKEN</code> — nicht vom anderen
            Shop kopieren.
          </p>
        </div>
      </div>

      <IntegrationStatusPill
        ready={configured}
        readyLabel="Upload bereit"
        pendingLabel="Token fehlt"
      />

      {configured ? null : (
        <p className="mt-4 text-sm text-[#6b7280]">
          Vercel → Storage → Blob (public) mit diesem Projekt verknüpfen, Token als{" "}
          <code className="text-[11px]">BLOB_READ_WRITE_TOKEN</code> setzen, Redeploy.
        </p>
      )}
    </section>
  );
}
