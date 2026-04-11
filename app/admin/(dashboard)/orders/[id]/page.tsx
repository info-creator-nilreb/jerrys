import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/catalog/format";
import { getOrderDetailForAdmin } from "@/lib/orders/admin-queries";
import { emailSendStatusLabel, emailTypeLabel } from "@/lib/orders/email-status-label";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeStyle: "short",
});

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

      <p className="border-t border-[#e8eaed] pt-6 text-xs text-[#9ca3af]">
        Status-Historie und erlaubte Statuswechsel im Admin folgen in einer späteren Ausbaustufe.
      </p>
    </div>
  );
}
