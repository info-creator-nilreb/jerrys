import Link from "next/link";
import { PromotionForm } from "@/app/admin/(dashboard)/promotions/promotion-form";
import type { PromotionTypeId } from "@/lib/promotions/types";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

export const metadata = {
  title: "Neue Promotion",
};

export default async function NewPromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const t: PromotionTypeId =
    sp.type === "free_shipping"
      ? "free_shipping"
      : sp.type === "cheapest_item_percent"
        ? "cheapest_item_percent"
        : "order_discount";

  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 30);
  const defaultStartDate = start.toISOString().slice(0, 10);
  const defaultEndDate = end.toISOString().slice(0, 10);
  const shopShip = await getShopShippingSettings();

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm text-[#6b7280]">
        <Link href="/admin/promotions" className="font-medium text-primary hover:underline">
          ← Zurück zu Promotions
        </Link>
      </p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Promotion erstellen</h1>
      <p className="mt-2 text-sm text-[#6b7280]">
        Konfiguriere Rabatt, Einlösung und Zeitraum. Speichern veröffentlicht die Promotion.
      </p>
      <div className="mt-8">
        <PromotionForm
          promotionType={t}
          availableShippingCountryCodes={shopShip.shippingCountryCodes}
          defaultStartDate={defaultStartDate}
          defaultEndDate={defaultEndDate}
        />
      </div>
    </div>
  );
}
