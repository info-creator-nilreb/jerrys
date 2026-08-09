import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerOrderStatusBadge } from "@/components/storefront/customer-order-status-badge";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getOrderForCustomer } from "@/features/customers";
import { formatPrice } from "@/lib/catalog/format";
import { transactionalPaymentLabel } from "@/lib/email/transactional-email-layout";

export const metadata = {
  title: "Bestelldetails",
  robots: { index: false, follow: false },
};

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const { orderNumber: raw } = await params;
  const orderNumber = decodeURIComponent(raw ?? "").trim();
  if (!orderNumber) notFound();

  let order: Awaited<ReturnType<typeof getOrderForCustomer>> = null;
  try {
    order = await getOrderForCustomer({
      customerId: session.customerId,
      orderNumber,
    });
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-(--foreground-heading)">Bestelldetails</h1>
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Die Bestellung konnte gerade nicht geladen werden.
        </p>
        <Link href="/konto/bestellungen" className={customerAuthSecondaryLinkClass}>
          Zurück zu Bestellungen
        </Link>
      </div>
    );
  }

  if (!order) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm">
          <Link href="/konto/bestellungen" className={customerAuthSecondaryLinkClass}>
            ← Bestellungen
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Bestellung #{order.orderNumber}
        </h1>
        <p className="text-sm text-(--foreground-muted)">
          {order.createdAt.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
        <CustomerOrderStatusBadge
          status={order.status}
          fulfillmentStatus={order.fulfillmentStatus}
        />
      </header>

      <section aria-labelledby="items-heading" className="space-y-3">
        <h2 id="items-heading" className="text-base font-semibold text-(--foreground-heading)">
          Artikel
        </h2>
        <ul className="divide-y divide-(--surface-muted) rounded-md border border-(--surface-muted)">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-(--foreground-heading)">{item.productTitleSnapshot}</p>
                <p className="text-sm text-(--foreground-muted)">
                  {item.quantity} × {formatPrice(item.unitPriceGrossCents, order.currency)}
                  {item.skuSnapshot ? ` · ${item.skuSnapshot}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-(--foreground-heading)">
                {formatPrice(item.lineTotalGrossCents, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="totals-heading" className="space-y-2">
        <h2 id="totals-heading" className="text-base font-semibold text-(--foreground-heading)">
          Summe
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-(--foreground-muted)">Zwischensumme</dt>
            <dd className="tabular-nums text-(--foreground-heading)">
              {formatPrice(order.subtotalGrossCents, order.currency)}
            </dd>
          </div>
          {order.discountOffSubtotalCents > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-(--foreground-muted)">Rabatt</dt>
              <dd className="tabular-nums text-(--foreground-heading)">
                −{formatPrice(order.discountOffSubtotalCents, order.currency)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-(--foreground-muted)">Versand</dt>
            <dd className="tabular-nums text-(--foreground-heading)">
              {formatPrice(order.shippingCents, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-(--surface-muted) pt-2 text-base font-semibold">
            <dt className="text-(--foreground-heading)">Gesamt</dt>
            <dd className="tabular-nums text-(--foreground-heading)">
              {formatPrice(order.totalGrossCents, order.currency)}
            </dd>
          </div>
          <p className="pt-1 text-xs text-(--foreground-muted)">
            inkl. MwSt. · {transactionalPaymentLabel(order.paymentMethod)}
          </p>
        </dl>
      </section>

      <section aria-labelledby="ship-heading" className="space-y-2">
        <h2 id="ship-heading" className="text-base font-semibold text-(--foreground-heading)">
          Lieferadresse
        </h2>
        <address className="not-italic text-sm leading-relaxed text-(--foreground-muted)">
          {[order.shippingFirstName, order.shippingLastName].filter(Boolean).join(" ")}
          <br />
          {order.shippingCompany ? (
            <>
              {order.shippingCompany}
              <br />
            </>
          ) : null}
          {order.shippingLine1}
          <br />
          {order.shippingLine2 ? (
            <>
              {order.shippingLine2}
              <br />
            </>
          ) : null}
          {order.shippingZip} {order.shippingCity}
          <br />
          {order.shippingCountry}
        </address>
        {order.trackingNumber ? (
          <p className="text-sm text-(--foreground-heading)">
            Sendungsverfolgung:{" "}
            <span className="font-mono font-medium">{order.trackingNumber}</span>
            {order.shippingCarrier ? (
              <span className="text-(--foreground-muted)"> ({order.shippingCarrier})</span>
            ) : null}
          </p>
        ) : null}
      </section>
    </div>
  );
}
