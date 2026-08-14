import Link from "next/link";
import { ShopifyImportForm } from "@/app/admin/(dashboard)/einstellungen/importe/produkte/shopify-import-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Produkte importieren",
};

export default function AdminShopifyProductImportPage() {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7280]">
            <Link href="/admin/einstellungen" className="font-medium text-primary hover:underline">
              Einstellungen
            </Link>
            <span className="mx-1.5 text-[#d1d5db]">/</span>
            <Link
              href="/admin/einstellungen/importe"
              className="font-medium text-primary hover:underline"
            >
              Importe
            </Link>
            <span className="mx-1.5 text-[#d1d5db]">/</span>
            Produkte
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Produkte importieren (Shopify)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            CSV aus Shopify prüfen und in den Katalog übernehmen. Zuerst Vorschau, dann bestätigter
            Schreibvorgang — bestehende Slugs nur mit expliziter Update-Option.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-[#e8eaed] pt-8">
        <ShopifyImportForm />
      </div>
    </div>
  );
}
