import Link from "next/link";
import { ShopifyImportForm } from "@/app/admin/(dashboard)/products/shopify-import/shopify-import-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shopify-Import",
};

export default function AdminShopifyImportPage() {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7280]">
            <Link href="/admin/products" className="font-medium text-primary hover:underline">
              Katalog
            </Link>
            <span className="mx-1.5 text-[#d1d5db]">/</span>
            Import
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Shopify-Import
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            CSV aus Shopify prüfen und in den Katalog übernehmen. Zuerst Vorschau, dann
            bestätigter Schreibvorgang — bestehende Slugs nur mit expliziter Update-Option.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-[#e8eaed] pt-8">
        <ShopifyImportForm />
      </div>
    </div>
  );
}
