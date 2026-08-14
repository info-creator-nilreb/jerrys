import Link from "next/link";
import { ShopifyOrderImportForm } from "@/app/admin/(dashboard)/orders/shopify-import/shopify-import-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shopify-Bestellimport",
};

export default function AdminShopifyOrderImportPage() {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7280]">
            <Link href="/admin/orders" className="font-medium text-primary hover:underline">
              Bestellungen
            </Link>
            <span className="mx-1.5 text-[#d1d5db]">/</span>
            Shopify-Import
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Shopify-Bestellimport
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            Historische Bestellungen aus Shopify als Gastbestellungen importieren. Zuerst Vorschau,
            dann bestätigter Schreibvorgang. Produkte sollten vorher im Katalog importiert sein.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-[#e8eaed] pt-8">
        <ShopifyOrderImportForm />
      </div>
    </div>
  );
}
