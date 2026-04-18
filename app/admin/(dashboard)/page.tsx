import Link from "next/link";
import { OrderTableRowLink } from "@/app/admin/(dashboard)/orders/order-table-row-link";
import { OrderTriplePill } from "@/app/admin/(dashboard)/orders/order-triple-pill";
import { auth } from "@/auth";
import { formatPrice } from "@/lib/catalog/format";
import { getAdminDashboardOrdersSnapshot } from "@/lib/orders/admin-queries";
import { deriveTripleFromOrder } from "@/lib/orders/order-admin-triple";

export const dynamic = "force-dynamic";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function firstNameFromSession(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const first = n.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email.split("@")[0] ?? "Admin";
  const segment = local.split(/[._-]/)[0] ?? local;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminHomePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? "";
  const first = firstNameFromSession(name, email);

  const { totalCount, pendingPaymentCount, revenueEurCents, recent } =
    await getAdminDashboardOrdersSnapshot();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937] lg:text-[1.65rem]">
          {timeGreeting()}, {first}.
        </h1>
        <p className="mt-2 text-[0.9375rem] text-[#6b7280]">
          Hier steuerst du Katalog und Shop von jerry&apos;s.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Kurz zu deinem Shop</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/admin/products" className="font-medium text-primary hover:underline">
                Produkte im Katalog pflegen
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className="font-medium text-primary hover:underline">
                Bestellungen und Zahlungsstatus
              </Link>
            </li>
            <li>
              <Link href="/admin/customers" className="font-medium text-primary hover:underline">
                Kundenübersicht
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Der erste Eindruck zählt.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
            Storefront und Admin sind aufeinander abgestimmt. Wenn dir etwas fehlt oder stört,
            sammeln wir das für die nächsten Iterationen.
          </p>
          <p className="mt-4 text-xs text-[#9ca3af]">Feedback geben — demnächst verlinkt.</p>
        </section>
      </div>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f1f3] pb-4">
          <h2 className="text-base font-semibold text-[#1f2937]">Bestellungen</h2>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-primary hover:underline"
          >
            Alle anzeigen
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#e8eaed] bg-[#f7f8fa] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
              Bestellungen gesamt
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1f2937]">{totalCount}</p>
          </div>
          <div className="rounded-lg border border-[#e8eaed] bg-[#f7f8fa] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
              Umsatz brutto (EUR)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1f2937]">
              {formatPrice(revenueEurCents, "EUR")}
            </p>
          </div>
          <div className="rounded-lg border border-[#e8eaed] bg-[#f7f8fa] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
              Zahlung ausstehend
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1f2937]">
              {pendingPaymentCount}
            </p>
          </div>
        </div>

        {recent.length === 0 ? (
          <p className="pt-6 text-sm text-[#6b7280]">
            Noch keine Bestellungen. Sobald Kundinnen und Kunden im Checkout bestellen, erscheinen
            sie hier und unter{" "}
            <Link href="/admin/orders" className="font-medium text-primary hover:underline">
              Bestellungen
            </Link>
            .
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-[#e8eaed]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Bestellnr.
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Datum
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    E-Mail
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Positionen
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Zahlung
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Lieferung
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Bestellung
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Summe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8eaed]">
                {recent.map((o) => {
                  const triple = deriveTripleFromOrder(o);
                  return (
                    <OrderTableRowLink
                      key={o.id}
                      href={`/admin/orders/${o.id}`}
                      ariaLabel={`Bestellung ${o.orderNumber} öffnen`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#374151]">{o.orderNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#6b7280]">
                        {dateFmt.format(o.createdAt)}
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-3 text-[#374151]">{o.email}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{o._count.items}</td>
                      <td className="px-4 py-3">
                        <OrderTriplePill triple={triple} dim="payment" />
                      </td>
                      <td className="px-4 py-3">
                        <OrderTriplePill triple={triple} dim="shipping" />
                      </td>
                      <td className="px-4 py-3">
                        <OrderTriplePill triple={triple} dim="order" />
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1f2937]">
                        {formatPrice(o.totalGrossCents, o.currency)}
                      </td>
                    </OrderTableRowLink>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
