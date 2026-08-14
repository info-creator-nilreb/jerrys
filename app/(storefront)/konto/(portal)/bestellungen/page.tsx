import Link from "next/link";
import {
  customerAuthPrimaryButtonClass,
} from "@/components/storefront/customer-auth-shell";
import { CustomerGuestOrderClaimHint } from "@/components/storefront/customer-guest-order-claim-hint";
import { CustomerOrderStatusBadge } from "@/components/storefront/customer-order-status-badge";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { countClaimableGuestOrders, listOrdersForCustomer } from "@/features/customers";
import { formatPrice } from "@/lib/catalog/format";

export const metadata = {
  title: "Bestellungen",
  robots: { index: false, follow: false },
};

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ zugeordnet?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const sp = await searchParams;
  const claimedCount = Number.parseInt(sp.zugeordnet ?? "", 10);
  const claimedBanner = Number.isFinite(claimedCount) && claimedCount > 0 ? claimedCount : 0;

  let ordersError: string | null = null;
  let orders: Awaited<ReturnType<typeof listOrdersForCustomer>> = [];
  try {
    orders = await listOrdersForCustomer(session.customerId);
  } catch {
    ordersError = "Bestellungen konnten gerade nicht geladen werden. Bitte später erneut versuchen.";
  }

  let claimableCount = 0;
  try {
    claimableCount = await countClaimableGuestOrders(session.customerId);
  } catch {
    claimableCount = 0;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Bestellungen
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Nur Bestellungen, die mit deinem verifizierten Konto verknüpft sind.
        </p>
      </header>

      {claimedBanner > 0 ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          {claimedBanner === 1
            ? "1 frühere Bestellung wurde deinem Konto zugeordnet."
            : `${claimedBanner} frühere Bestellungen wurden deinem Konto zugeordnet.`}
        </p>
      ) : null}

      <CustomerGuestOrderClaimHint orderCount={claimableCount} />

      {ordersError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {ordersError}
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-8 text-sm text-(--foreground-muted)">
          <p className="font-medium text-(--foreground-heading)">Keine Bestellungen</p>
          <p className="mt-2">
            Sobald du angemeldet bestellst, erscheinen die Bestellungen hier. Frühere Gastbestellungen
            werden erst nach sicherer Zuordnung sichtbar.
          </p>
          <Link
            href="/produkte"
            className={`${customerAuthPrimaryButtonClass} mt-5 inline-flex w-auto px-5`}
          >
            Produkte entdecken
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/konto/bestellungen/${encodeURIComponent(order.orderNumber)}`}
                className="block rounded-md border border-(--surface-muted) px-4 py-4 transition-colors hover:border-primary/40 hover:bg-(--surface-soft)"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="font-semibold text-(--foreground-heading)">
                      Bestellung #{order.orderNumber}
                    </p>
                    <p className="text-sm text-(--foreground-muted)">
                      {order.createdAt.toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "Artikel" : "Artikel"}
                    </p>
                    <CustomerOrderStatusBadge
                      status={order.status}
                      fulfillmentStatus={order.fulfillmentStatus}
                      deliveryMethod={order.deliveryMethod}
                    />
                  </div>
                  <p className="text-base font-semibold tabular-nums text-(--foreground-heading)">
                    {formatPrice(order.totalGrossCents, order.currency)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
