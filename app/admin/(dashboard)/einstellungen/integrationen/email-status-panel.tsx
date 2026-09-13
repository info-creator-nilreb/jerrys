import { Mail } from "lucide-react";
import { IntegrationStatusPill } from "./integration-status-pill";
import type { EmailIntegrationStatus } from "@/lib/email/email-integration-status";

export function EmailStatusPanel(props: EmailIntegrationStatus) {
  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Mail className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#1f2937]">E-Mail (Resend)</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Bestellbestätigung, Versand und Konto-Mails laufen über Resend. Schlüssel und
            Absender stehen in Vercel (Production dieses Shops) — nicht im Admin-Formular.
          </p>
        </div>
      </div>

      <IntegrationStatusPill
        ready={props.ready}
        readyLabel="Versand bereit"
        pendingLabel="Noch nicht konfiguriert"
      />

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6b7280]">API-Key</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.apiKeyConfigured ? "gesetzt" : "fehlt (RESEND_API_KEY)"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Absender</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.from ?? "fehlt (MAIL_FROM_EMAIL / MAIL_FROM)"}
          </dd>
        </div>
      </dl>

      {props.ready ? null : (
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-[#6b7280]">
          <li>
            In Resend die Shop-Domain verifizieren (DNS laut Resend-Dashboard, dieselbe Domain
            wie <code className="text-[11px]">MAIL_FROM_EMAIL</code>).
          </li>
          <li>
            Vercel → Projekt dieses Shops → Production:{" "}
            <code className="text-[11px]">RESEND_API_KEY</code>,{" "}
            <code className="text-[11px]">MAIL_FROM_EMAIL</code> (Adresse der verifizierten
            Domain), optional <code className="text-[11px]">MAIL_FROM_NAME</code>.
          </li>
          <li>Redeploy, danach diese Seite neu laden.</li>
        </ol>
      )}
    </section>
  );
}
