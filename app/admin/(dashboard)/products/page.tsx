import Link from "next/link";
import { listProductsForAdmin } from "@/lib/catalog/queries";
import {
  ProductsAdminTable,
  type AdminProductListRow,
} from "@/app/admin/(dashboard)/products/products-admin-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog",
};

export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();
  const rows: AdminProductListRow[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    currency: p.currency,
    isActive: p.isActive,
    priceGrossCents: p.variants[0]?.priceGrossCents ?? 0,
    thumbUrl: p.images[0]?.url ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Katalog</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Produkte für den Shop — auswählen für Aktivieren, Deaktivieren oder Löschen
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/collections"
            className="rounded-md border border-[#e3e4e8] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            Kollektionen
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
          >
            Neues Produkt
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">
          Noch keine Produkte.{" "}
          <Link href="/admin/products/new" className="font-medium text-primary hover:underline">
            Erstes Produkt anlegen
          </Link>
          {" "}oder{" "}
          <Link
            href="/admin/einstellungen/importe/produkte"
            className="font-medium text-primary hover:underline"
          >
            aus Shopify importieren
          </Link>
          .
        </p>
      ) : (
        <ProductsAdminTable products={rows} />
      )}
    </div>
  );
}
