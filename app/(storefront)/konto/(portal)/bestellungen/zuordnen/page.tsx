import Link from "next/link";
import { CustomerGuestOrderClaimForm } from "@/components/storefront/customer-guest-order-claim-form";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { listClaimableGuestOrders } from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { formatPrice } from "@/lib/catalog/format";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export const metadata = {
  title: "Frühere Bestellungen zuordnen",
  robots: { index: false, follow: false },
};

export default async function ClaimGuestOrdersPage() {
  const session = await getCustomerSession();
  if (!session) return null;

  let loadError: string | null = null;
  let orders: Awaited<ReturnType<typeof listClaimableGuestOrders>> = [];
  try {
    orders = await listClaimableGuestOrders(session.customerId);
  } catch {
    loadError = "Bestellungen konnten gerade nicht geprüft werden. Bitte später erneut versuchen.";
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/konto/bestellungen" className={`${customerAuthSecondaryLinkClass} text-sm`}>
          ← Bestellungen
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Frühere Bestellungen zuordnen
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Diese Bestellungen wurden ohne Konto aufgegeben — mit deiner bestätigten E-Mail-Adresse{" "}
          {session.email ? (
            <span className="font-medium text-(--foreground-heading)">{session.email}</span>
          ) : null}
          . Nach der Zuordnung erscheinen sie dauerhaft in deinem Konto.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-8 text-sm text-(--foreground-muted)">
          <p className="font-medium text-(--foreground-heading)">Keine offenen Bestellungen</p>
          <p className="mt-2">
            Wir haben keine Gastbestellung mit deiner bestätigten E-Mail-Adresse gefunden. Bestellungen
            mit einer anderen E-Mail-Adresse lassen sich aus Sicherheitsgründen nicht zuordnen — bitte
            wende dich dafür an den Support.
          </p>
          <Link href="/konto/bestellungen" className={`${customerAuthSecondaryLinkClass} mt-4 inline-block`}>
            Zu meinen Bestellungen
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-(--surface-muted) rounded-md border border-(--surface-muted)">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-(--foreground-heading)">
                    Bestellung #{order.orderNumber}
                  </p>
                  <p className="text-sm text-(--foreground-muted)">
                    {order.createdAt.toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {orderStatusLabel(order.status)} · {order.itemCount}{" "}
                    {order.itemCount === 1 ? "Artikel" : "Artikel"}
                  </p>
                  <p className="text-sm text-(--foreground-muted)">
                    Lieferung an {order.shippingLastName}, {order.shippingCity}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-(--foreground-heading)">
                  {formatPrice(order.totalGrossCents, order.currency)}
                </p>
              </li>
            ))}
          </ul>

          <p className="text-sm text-(--foreground-muted)">
            Die Zuordnung ändert nichts an den Bestellungen selbst: Adressen, Preise und Belege bleiben
            unverändert. Jede Zuordnung wird protokolliert.
          </p>

          <CustomerGuestOrderClaimForm orderCount={orders.length} />
        </>
      )}
    </div>
  );
}
