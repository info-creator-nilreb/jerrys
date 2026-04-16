import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderEmailLogResendButton } from "@/app/admin/(dashboard)/orders/order-email-log-resend-button";
import { OrderRefundButton } from "@/app/admin/(dashboard)/orders/order-refund-button";
import { OrderStatusPanel } from "@/app/admin/(dashboard)/orders/order-status-panel";
import { CopyTextButton } from "@/app/admin/(dashboard)/orders/copy-text-button";
import { OrderDetailTabs } from "@/app/admin/(dashboard)/orders/order-detail-tabs";
import { OrderInvoiceGenerateButton } from "@/app/admin/(dashboard)/orders/order-invoice-generate-button";
import { formatPrice } from "@/lib/catalog/format";
import { EMAIL_ORDER_SHIPPED } from "@/lib/email/email-types";
import { isInvoiceAllocationAllowedForOrderStatus } from "@/lib/invoice/allocate-invoice-for-order";
import { getOrderDetailForAdmin } from "@/lib/orders/admin-queries";
import { emailSendStatusLabel, emailTypeLabel } from "@/lib/orders/email-status-label";
import {
  orderEventMetadataDescription,
  orderEventTypeTitle,
} from "@/lib/orders/order-event-label";
import { orderPaymentStatusLabel } from "@/lib/orders/order-payment-label";
import { orderStatusLabel } from "@/lib/orders/order-status-label";
import { buildCarrierTrackingUrl, shippingCarrierLabel } from "@/lib/shipping/carrier-tracking";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeStyle: "short",
});

const berlinDayKeyFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const berlinDayHeadingFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  dateStyle: "full",
});

function groupOrderEventsByBerlinDay<T extends { createdAt: Date }>(events: T[]) {
  const groups: { key: string; heading: string; events: T[] }[] = [];
  for (const ev of events) {
    const key = berlinDayKeyFmt.format(ev.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.events.push(ev);
    } else {
      groups.push({
        key,
        heading: berlinDayHeadingFmt.format(ev.createdAt),
        events: [ev],
      });
    }
  }
  return groups;
}

function orderEventTypeBadgeClass(eventType: string): string {
  switch (eventType) {
    case "order.placed":
      return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100";
    case "order.status_changed":
      return "bg-[#eef2f7] text-[#374151] ring-1 ring-[#e5e7eb]";
    case "email.delivery":
      return "bg-[#eef2f7] text-[#374151] ring-1 ring-[#e5e7eb]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280] ring-1 ring-[#e5e7eb]";
  }
}

function addressLines(
  first: string,
  last: string,
  company: string | null,
  line1: string,
  line2: string | null,
  zip: string,
  city: string,
  country: string,
): string[] {
  return [`${first} ${last}`, company, line1, line2, `${zip} ${city}`, country].filter(Boolean) as string[];
}

function formatPaymentFeesLine(metadata: unknown): string | null {
  if (metadata == null) return null;
  if (typeof metadata === "object" && metadata !== null) {
    const m = metadata as Record<string, unknown>;
    const candidates = [
      m.paypal_fee,
      m.paypalFee,
      m.fee,
      m.fee_amount,
      m.seller_receivable,
      m.net_amount,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).length > 0) {
        return String(c);
      }
    }
  }
  return null;
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetailForAdmin(id);
  if (!order) notFound();

  const shipLines = addressLines(
    order.shippingFirstName,
    order.shippingLastName,
    order.shippingCompany,
    order.shippingLine1,
    order.shippingLine2,
    order.shippingZip,
    order.shippingCity,
    order.shippingCountry,
  );
  const billLines = addressLines(
    order.billingFirstName,
    order.billingLastName,
    order.billingCompany,
    order.billingLine1,
    order.billingLine2,
    order.billingZip,
    order.billingCity,
    order.billingCountry,
  );
  const billingMatchesShipping = shipLines.join("\n") === billLines.join("\n");
  const shippingEmailSent = order.emailLogs.some(
    (l) => l.emailType === EMAIL_ORDER_SHIPPED && l.status === "sent",
  );
  const canGenerateInvoice =
    !order.invoiceNumber && isInvoiceAllocationAllowedForOrderStatus(order.status);
  const emailLogsChronological = [...order.emailLogs].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const tabAllgemein = (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-[#374151]">Status ändern</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Technischer Status:{" "}
          <span className="font-medium text-[#1f2937]">{orderStatusLabel(order.status)}</span>
        </p>
        <OrderStatusPanel orderId={order.id} order={order} />
      </section>

      {order.shippingCarrier && order.trackingNumber ? (
        <section className="border-t border-[#e8eaed] pt-6">
          <h2 className="text-sm font-semibold text-[#374151]">Versand</h2>
          <p className="mt-2 text-sm text-[#1f2937]">
            {shippingCarrierLabel(order.shippingCarrier)} ·{" "}
            <span className="font-mono">{order.trackingNumber}</span>
          </p>
          {(() => {
            const u = buildCarrierTrackingUrl(order.shippingCarrier!, order.trackingNumber!);
            return u ? (
              <p className="mt-2 text-sm">
                <a
                  href={u}
                  className="font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sendung verfolgen
                </a>
              </p>
            ) : null;
          })()}
        </section>
      ) : null}

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Positionen</h2>
        <ul className="mt-4 divide-y divide-[#e8eaed] rounded-lg border border-[#e8eaed]">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-[#1f2937]">{item.productTitleSnapshot}</p>
                <p className="text-xs text-[#6b7280]">
                  {item.quantity} × {formatPrice(item.unitPriceGrossCents, item.currency)}
                  {item.taxRatePercentSnapshot > 0 ? (
                    <>
                      {" "}
                      · MwSt. {item.taxRatePercentSnapshot}%
                    </>
                  ) : (
                    <> · ohne USt.-Ausweis</>
                  )}
                </p>
                <Link
                  href={`/admin/products/${item.product.id}/edit`}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Produkt im Katalog
                </Link>
              </div>
              <p className="shrink-0 font-medium text-[#1f2937]">
                {formatPrice(item.lineTotalGrossCents, item.currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <dl className="mx-auto max-w-sm space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b7280]">
              {order.vatApplies ? "Zwischensumme (brutto)" : "Zwischensumme (netto)"}
            </dt>
            <dd className="font-medium">{formatPrice(order.subtotalGrossCents, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b7280]">Versand</dt>
            <dd className="font-medium">{formatPrice(order.shippingCents, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b7280]">{order.vatApplies ? "MwSt. gesamt" : "Umsatzsteuer"}</dt>
            <dd className="font-medium">
              {order.vatApplies ? formatPrice(order.taxAmountCents, order.currency) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[#e8eaed] pt-3 text-base font-semibold">
            <dt className="text-[#1f2937]">Gesamt</dt>
            <dd>{formatPrice(order.totalGrossCents, order.currency)}</dd>
          </div>
        </dl>
      </section>

      {order.customerNote ? (
        <section className="border-t border-[#e8eaed] pt-6">
          <div className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] p-4 text-sm text-[#374151]">
            <p className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">Hinweis vom Kunden</p>
            <p className="mt-2 whitespace-pre-wrap">{order.customerNote}</p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 border-t border-[#e8eaed] pt-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-[#374151]">Lieferadresse</h2>
          <div className="mt-2 flex items-start gap-2">
            <address className="inline-block text-sm not-italic leading-relaxed text-[#6b7280]">
              {shipLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <CopyTextButton text={shipLines.join("\n")} label="Lieferadresse kopieren" />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#374151]">Rechnungsadresse</h2>
          {billingMatchesShipping ? (
            <p className="mt-2 text-sm text-[#6b7280]">Entspricht der Lieferadresse.</p>
          ) : (
            <div className="mt-2 flex items-start gap-2">
              <address className="inline-block text-sm not-italic leading-relaxed text-[#6b7280]">
                {billLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <CopyTextButton text={billLines.join("\n")} label="Rechnungsadresse kopieren" />
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Kontakt</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#1f2937]">{order.email}</span>
          <CopyTextButton text={order.email} label="E-Mail-Adresse kopieren" />
        </div>
        {order.phone ? <p className="mt-1 text-sm text-[#6b7280]">{order.phone}</p> : null}
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Kommunikationshistorie</h2>
        <p className="mt-1 text-xs text-[#6b7280]">E-Mail-Versand an die Kundin / den Kunden (chronologisch).</p>
        {emailLogsChronological.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">Noch keine Einträge.</p>
        ) : (
          <ol className="mt-6 space-y-8">
            {emailLogsChronological.map((log) => (
              <li key={log.id} className="flex gap-3">
                <div
                  className="relative flex w-6 shrink-0 flex-col items-center justify-center self-stretch"
                  aria-hidden
                >
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e5e7eb]" />
                  <span className="relative z-10 size-2.5 shrink-0 rounded-full border-2 border-white bg-primary ring-1 ring-[#e5e7eb]" />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-3 text-[#374151]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{emailTypeLabel(log.emailType)}</span>
                    <time className="text-xs text-[#6b7280]" dateTime={log.createdAt.toISOString()}>
                      {dateFmt.format(log.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    An: {log.toEmail} · {emailSendStatusLabel(log.status)}
                    {log.providerId ? ` · ID: ${log.providerId}` : null}
                  </p>
                  {log.errorMessage ? (
                    <p className="mt-2 whitespace-pre-wrap rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                      {log.errorMessage}
                    </p>
                  ) : null}
                  <OrderEmailLogResendButton orderId={order.id} emailType={log.emailType} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );

  const tabZahlung = (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-[#374151]">Zahlungsart</h2>
        <p className="mt-2 text-sm capitalize text-[#1f2937]">{order.paymentMethod.replaceAll("_", " ")}</p>
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Beträge</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b7280]">Bestellwert (brutto)</dt>
            <dd className="font-medium text-[#1f2937]">{formatPrice(order.totalGrossCents, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">PSP-Zahlungen</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Einträge vom Zahlungsdienstleister (z. B. PayPal), sobald eine Zahlung ausgelöst oder abgeschlossen wurde.
        </p>
        {order.payments.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">Noch keine PSP-Einträge.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {order.payments.map((p) => {
              const feeLine = formatPaymentFeesLine(p.metadata);
              return (
                <li
                  key={p.id}
                  className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-3 text-[#374151]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-[#6b7280]">{p.provider}</span>
                    <time className="text-xs text-[#6b7280]" dateTime={p.createdAt.toISOString()}>
                      {dateFmt.format(p.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 font-medium">{orderPaymentStatusLabel(p.status)}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Zahlungs-ID: <span className="font-mono">{p.providerRef}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Betrag: {formatPrice(p.amountGrossCents, p.currency)}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Gebühren / Netto (PSP): {feeLine ?? "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Rückerstattung</h2>
        <div className="mt-3">
          <OrderRefundButton orderId={order.id} order={order} />
        </div>
      </section>
    </div>
  );

  const tabVerlauf = (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-[#374151]">Status-Historie</h2>
        {order.statusHistory.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">Noch keine Einträge.</p>
        ) : (
          <ol className="mt-4 space-y-3 text-sm">
            {order.statusHistory.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-3"
              >
                <span className="text-[#374151]">
                  {row.fromStatus ? (
                    <>
                      <span className="font-medium">{orderStatusLabel(row.fromStatus)}</span>
                      <span className="text-[#9ca3af]"> → </span>
                    </>
                  ) : (
                    <span className="text-[#9ca3af]">Start · </span>
                  )}
                  <span className="font-medium">{orderStatusLabel(row.toStatus)}</span>
                </span>
                <time className="text-xs text-[#6b7280]" dateTime={row.createdAt.toISOString()}>
                  {dateFmt.format(row.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Ereignisprotokoll</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Technischer Ablauf (Checkout, Status, E-Mail-Versuche) – ergänzend zur Status-Historie.
        </p>
        {order.events.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">Noch keine Einträge.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {groupOrderEventsByBerlinDay(order.events).map((day) => (
              <div key={day.key}>
                <p className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">{day.heading}</p>
                <ol className="mt-3 space-y-3 text-sm">
                  {day.events.map((ev) => {
                    const detail = orderEventMetadataDescription(ev.eventType, ev.metadata);
                    return (
                      <li
                        key={ev.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-3 text-[#374151]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex max-w-full rounded px-2 py-0.5 text-xs font-semibold ${orderEventTypeBadgeClass(ev.eventType)}`}
                            >
                              {orderEventTypeTitle(ev.eventType)}
                            </span>
                          </div>
                          {detail ? <p className="mt-2 text-xs text-[#6b7280]">{detail}</p> : null}
                        </div>
                        <time className="shrink-0 text-xs text-[#6b7280]" dateTime={ev.createdAt.toISOString()}>
                          {dateFmt.format(ev.createdAt)}
                        </time>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const tabDokumente = (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-[#374151]">Rechnung (PDF)</h2>
        {order.invoiceNumber ? (
          <div className="mt-3 rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-4">
            <p className="text-sm text-[#1f2937]">
              Rechnungsnr. <span className="font-mono font-medium">{order.invoiceNumber}</span>
              {order.invoiceIssuedAt ? (
                <span className="text-[#6b7280]"> · {dateFmt.format(order.invoiceIssuedAt)}</span>
              ) : null}
            </p>
            <p className="mt-4">
              <a
                href={`/api/admin/orders/${order.id}/invoice`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover)"
                download
              >
                Rechnung herunterladen
              </a>
            </p>
          </div>
        ) : canGenerateInvoice ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[#6b7280]">
              Noch keine Rechnungsnummer vergeben. Du kannst die Rechnung jetzt erzeugen und als PDF speichern.
            </p>
            {!shippingEmailSent ? (
              <p className="text-sm text-[#374151]">
                <span className="font-medium text-[#1f2937]">Hinweis:</span> Wurde noch keine Versandbenachrichtigung
                gesendet, verwendet die automatische E-Mail beim Versandmelden dieselbe PDF-Datei als Anhang (sobald
                Rechnungsnummer und PDF vorliegen).
              </p>
            ) : (
              <p className="text-sm text-[#374151]">
                <span className="font-medium text-[#1f2937]">Hinweis:</span> Die Versandbenachrichtigung wurde bereits
                gesendet. Die Rechnung kannst du hier erzeugen und herunterladen; sie wird nicht erneut per E-Mail
                verschickt.
              </p>
            )}
            <OrderInvoiceGenerateButton orderId={order.id} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6b7280]">
            Für diese Bestellung kann keine Rechnung erzeugt werden, oder sie wird beim Versandmelden vergeben.
          </p>
        )}
      </section>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7280]">
            <Link href="/admin/orders" className="font-medium text-primary hover:underline">
              ← Alle Bestellungen
            </Link>
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Bestellung {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">{dateFmt.format(order.createdAt)}</p>
        </div>
      </div>

      <Suspense
        fallback={<div className="border-t border-[#e8eaed] pt-6 text-sm text-[#6b7280]">Laden…</div>}
      >
        <OrderDetailTabs
          allgemein={tabAllgemein}
          zahlung={tabZahlung}
          verlauf={tabVerlauf}
          dokumente={tabDokumente}
        />
      </Suspense>
    </div>
  );
}
