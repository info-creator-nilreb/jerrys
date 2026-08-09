import Link from "next/link";
import { customerSignOutAction } from "@/app/(storefront)/konto/actions";
import {
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listOrdersForCustomer } from "@/features/customers";
import { formatPrice } from "@/lib/catalog/format";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export const metadata = {
  title: "Mein Konto",
  robots: { index: false, follow: false },
};

export default async function CustomerAccountPage() {
  const session = await getCustomerSession();
  if (!session) return null;

  let ordersError: string | null = null;
  let recentOrders: Awaited<ReturnType<typeof listOrdersForCustomer>> = [];
  try {
    const all = await listOrdersForCustomer(session.customerId);
    recentOrders = all.slice(0, 3);
  } catch {
    ordersError = "Bestellungen konnten gerade nicht geladen werden.";
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Übersicht
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Angemeldet als {session.email ?? "Kunde"}.
        </p>
      </header>

      <section aria-labelledby="recent-orders-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="recent-orders-heading"
            className="text-base font-semibold text-(--foreground-heading)"
          >
            Letzte Bestellungen
          </h2>
          <Link href="/konto/bestellungen" className={customerAuthSecondaryLinkClass}>
            Alle anzeigen
          </Link>
        </div>

        {ordersError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {ordersError}
          </p>
        ) : recentOrders.length === 0 ? (
          <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-6 text-sm text-(--foreground-muted)">
            <p>Noch keine Bestellungen in deinem Konto.</p>
            <p className="mt-2">
              Neue Bestellungen erscheinen hier, wenn du angemeldet einkaufst. Gastbestellungen
              kannst du später zuordnen.
            </p>
            <Link
              href="/produkte"
              className={`${customerAuthPrimaryButtonClass} mt-4 inline-flex w-auto px-5`}
            >
              Zum Katalog
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-(--surface-muted) rounded-md border border-(--surface-muted)">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/konto/bestellungen/${encodeURIComponent(order.orderNumber)}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-(--surface-soft) sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-(--foreground-heading)">
                      #{order.orderNumber}
                    </p>
                    <p className="text-sm text-(--foreground-muted)">
                      {order.createdAt.toLocaleDateString("de-DE")} ·{" "}
                      {orderStatusLabel(order.status)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-(--foreground-heading)">
                    {formatPrice(order.totalGrossCents, order.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={customerSignOutAction}>
        <button
          type="submit"
          className="text-sm font-medium text-(--foreground-muted) underline-offset-2 hover:text-(--foreground-heading) hover:underline"
        >
          Abmelden
        </button>
      </form>
    </div>
  );
}
