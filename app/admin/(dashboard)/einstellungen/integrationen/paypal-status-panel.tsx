import { CreditCard } from "lucide-react";
import { IntegrationStatusPill } from "./integration-status-pill";
import type { PayPalIntegrationStatus } from "@/lib/payments/paypal-integration-status";

export function PayPalStatusPanel(props: PayPalIntegrationStatus) {
  const pillReady =
    props.readyForLive ||
    (props.credentialsConfigured && props.env === "sandbox");
  const pillLabel = props.readyForLive
    ? "Live bereit"
    : props.credentialsConfigured
      ? props.env === "live"
        ? "Credentials live — Webhook fehlt"
        : "Sandbox verbunden"
      : "Noch nicht konfiguriert";

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <CreditCard className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#1f2937]">PayPal</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Checkout, Express und Apple Pay nutzen die Orders API v2. Client-ID, Secret,
            Umgebung und Webhook-ID kommen aus Vercel — eigene App pro Shop, keine
            Credentials von jerry&apos;s übernehmen.
          </p>
        </div>
      </div>

      <IntegrationStatusPill
        ready={pillReady}
        readyLabel={pillLabel}
        pendingLabel={pillLabel}
      />

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6b7280]">Umgebung</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.env === "live" ? "live" : "sandbox"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Client-ID</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.clientIdMasked ?? "fehlt"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Webhook-ID</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.webhookIdMasked ?? "fehlt (PAYPAL_WEBHOOK_ID)"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Webhook-URL</dt>
          <dd className="mt-0.5 break-all font-medium text-[#1f2937]">
            {props.webhookUrl ?? "NEXT_PUBLIC_SITE_URL setzen"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">SEPA-Lastschrift</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.sepaEnabled ? "aktiv" : "aus"}
          </dd>
        </div>
      </dl>

      {props.readyForLive ? null : (
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-[#6b7280]">
          <li>
            PayPal Developer Dashboard: App für diesen Shop (Sandbox zum Testen, Live für
            Production).
          </li>
          <li>
            Vercel Production:{" "}
            <code className="text-[11px]">PAYPAL_CLIENT_ID</code>,{" "}
            <code className="text-[11px]">PAYPAL_CLIENT_SECRET</code>,{" "}
            <code className="text-[11px]">PAYPAL_ENV</code> (
            <code className="text-[11px]">sandbox</code> oder{" "}
            <code className="text-[11px]">live</code>).
          </li>
          <li>
            Webhook auf{" "}
            <code className="text-[11px]">
              {props.webhookUrl ?? "https://<shop-host>/api/webhooks/paypal"}
            </code>{" "}
            anlegen; ID als <code className="text-[11px]">PAYPAL_WEBHOOK_ID</code> setzen.
            Events: <code className="text-[11px]">PAYMENT.CAPTURE.COMPLETED</code>,{" "}
            <code className="text-[11px]">CHECKOUT.ORDER.APPROVED</code>.
          </li>
          <li>Redeploy. Apple Pay: Domain im PayPal-Dashboard registrieren (exakter Host).</li>
        </ol>
      )}
    </section>
  );
}
