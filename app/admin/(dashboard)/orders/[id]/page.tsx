import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusPanel } from "@/app/admin/(dashboard)/orders/order-status-panel";
import { formatPrice } from "@/lib/catalog/format";
import { getOrderDetailForAdmin } from "@/lib/orders/admin-queries";
import { emailSendStatusLabel, emailTypeLabel } from "@/lib/orders/email-status-label";
import {
  orderEventMetadataDescription,
  orderEventTypeTitle,
} from "@/lib/orders/order-event-label";
import { allowedNextOrderStatuses } from "@/lib/orders/order-status-machine";
import { orderPaymentStatusLabel } from "@/lib/orders/order-payment-label";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

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
  return [
    `${first} ${last}`,
    company,
    line1,
    line2,
    `${zip} ${city}`,
    country,
  ].filter(Boolean) as string[];
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
  const allowedNext = allowedNextOrderStatuses(order.status);

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
        <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-sm font-medium text-emerald-800">
          {orderStatusLabel(order.status)}
        </span>
      </div>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Status ändern</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Aktuell: <span className="font-medium text-[#1f2937]">{orderStatusLabel(order.status)}</span>
        </p>
        <OrderStatusPanel orderId={order.id} allowedNext={allowedNext} />
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
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

      <section className="grid gap-6 border-t border-[#e8eaed] pt-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-[#374151]">Kontakt</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            <span className="text-[#1f2937]">{order.email}</span>
            {order.phone ? (
              <>
                <br />
                {order.phone}
              </>
            ) : null}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#374151]">Zahlungsart</h2>
          <p className="mt-2 text-sm capitalize text-[#1f2937]">{order.paymentMethod.replaceAll("_", " ")}</p>
        </div>
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">PSP-Zahlungsversuche</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Einträge aus dem Payment Service Provider (z. B. Stripe), sobald Epic 9 die Anbindung schreibt.
        </p>
        {order.payments.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">Noch keine PSP-Einträge.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {order.payments.map((p) => (
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
                  Ref: <span className="font-mono">{p.providerRef}</span> · {formatPrice(p.amountGrossCents, p.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-8 border-t border-[#e8eaed] pt-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-[#374151]">Lieferadresse</h2>
          <address className="mt-2 text-sm not-italic leading-relaxed text-[#6b7280]">
            {shipLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#374151]">Rechnungsadresse</h2>
          {billingMatchesShipping ? (
            <p className="mt-2 text-sm text-[#6b7280]">Entspricht der Lieferadresse.</p>
          ) : (
            <address className="mt-2 text-sm not-italic leading-relaxed text-[#6b7280]">
              {billLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          )}
        </div>
      </section>

      {order.customerNote ? (
        <section className="border-t border-[#e8eaed] pt-6">
          <div className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] p-4 text-sm text-[#374151]">
            <p className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">Hinweis vom Kunden</p>
            <p className="mt-2 whitespace-pre-wrap">{order.customerNote}</p>
          </div>
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
                  {item.quantity} × {formatPrice(item.unitPriceGrossCents, item.currency)} · MwSt.{" "}
                  {item.taxRatePercentSnapshot}%
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
            <dt className="text-[#6b7280]">Zwischensumme (brutto)</dt>
            <dd className="font-medium">{formatPrice(order.subtotalGrossCents, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b7280]">Versand</dt>
            <dd className="font-medium">{formatPrice(order.shippingCents, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b7280]">MwSt. gesamt</dt>
            <dd className="font-medium">{formatPrice(order.taxAmountCents, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[#e8eaed] pt-3 text-base font-semibold">
            <dt className="text-[#1f2937]">Gesamt</dt>
            <dd>{formatPrice(order.totalGrossCents, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">E-Mail-Protokoll</h2>
        {order.emailLogs.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">Noch keine Einträge.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {order.emailLogs.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-3 text-[#374151]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{emailTypeLabel(log.emailType)}</span>
                  <span className="text-xs text-[#6b7280]">{dateFmt.format(log.createdAt)}</span>
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-[#e8eaed] pt-6">
        <h2 className="text-sm font-semibold text-[#374151]">Ereignisprotokoll</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Technischer Ablauf (Checkout, Status, E-Mail-Versuche) – ergänzend zu Status-Historie und E-Mail-Log.
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
}
