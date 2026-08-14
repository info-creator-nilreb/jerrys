import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { OrdersAdminList } from "@/app/admin/(dashboard)/orders/orders-admin-list";
import { resolveAdminListPagination } from "@/lib/admin/list-pagination-page";
import { countOrdersForAdmin, listOrdersForAdmin } from "@/lib/orders/admin-queries";
import { formatOrderCreatedAt } from "@/lib/orders/format-order-created-at";
import { deriveTripleFromOrder } from "@/lib/orders/order-admin-triple";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bestellungen",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const total = await countOrdersForAdmin();
  const pagination = resolveAdminListPagination("/admin/orders", sp, total);
  const orders = await listOrdersForAdmin({
    skip: pagination.skip,
    take: pagination.take,
  });

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Bestellungen</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Eingegangene Shop-Bestellungen</p>
      </div>

      {total === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">Noch keine Bestellungen vorhanden.</p>
      ) : (
        <>
          <OrdersAdminList
            orders={orders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              createdAtLabel: formatOrderCreatedAt(o.createdAt),
              itemCount: o._count.items,
              totalGrossCents: o.totalGrossCents,
              currency: o.currency,
              triple: deriveTripleFromOrder(o),
            }))}
          />
          <AdminListPagination
            basePath="/admin/orders"
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
          />
        </>
      )}
    </div>
  );
}
