import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { CustomersAdminList } from "@/app/admin/(dashboard)/customers/customers-admin-list";
import { getCustomersForAdminListPage } from "@/lib/admin/customer-queries";
import { resolveAdminListPagination } from "@/lib/admin/list-pagination-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kunden",
};

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const { total } = await getCustomersForAdminListPage({ skip: 0, take: 0 });
  const pagination = resolveAdminListPagination("/admin/customers", sp, total);
  const { rows: customers } = await getCustomersForAdminListPage({
    skip: pagination.skip,
    take: pagination.take,
  });

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Kunden</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Kunden entstehen aus abgeschlossenen Bestellungen (gleiche E-Mail). Offene Express-Checkouts
          und Zahlungen ohne echte Kontaktdaten erscheinen hier nicht. Import-Kunden ohne Konto können
          zum Aufräumen entfernt werden.
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">Noch keine Kunden mit Bestellungen vorhanden.</p>
      ) : (
        <>
          <CustomersAdminList
            customers={customers.map((c) => ({
              customerKey: c.customerKey,
              customerNumber: c.customerNumber,
              displayName: c.displayName,
              email: c.email,
              latestOrderStatus: c.latestOrderStatus,
              orderCount: c.orderCount,
              lastOrderAtLabel: dateFmt.format(c.lastOrderAt),
              deletable: c.deletable,
            }))}
          />
          <AdminListPagination
            basePath="/admin/customers"
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
          />
        </>
      )}
    </div>
  );
}
