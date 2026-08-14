import Link from "next/link";
import { ShopifyOrderImportForm } from "@/app/admin/(dashboard)/einstellungen/importe/bestellungen/shopify-import-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bestellungen importieren",
};

export default function AdminShopifyOrderImportPage() {
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
            Bestellungen
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Bestellungen importieren (Shopify)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            Historische Bestellungen als Gastbestellungen importieren. Zuerst Vorschau, dann
            bestätigter Schreibvorgang. Produkte sollten vorher importiert sein — danach ordnen sich
            Kunden die Bestellungen nach E-Mail-Verifikation zu.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-[#e8eaed] pt-8">
        <ShopifyOrderImportForm />
      </div>
    </div>
  );
}
