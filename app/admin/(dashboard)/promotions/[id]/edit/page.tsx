import Link from "next/link";
import { notFound } from "next/navigation";
import { PromotionForm } from "@/app/admin/(dashboard)/promotions/promotion-form";
import { getPromotionByIdForAdmin } from "@/lib/promotions/admin-queries";
import type { PromotionTypeId } from "@/lib/promotions/types";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Promotion ${id.slice(0, 8)}…` };
}

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promotion = await getPromotionByIdForAdmin(id);
  if (!promotion) {
    notFound();
  }

  const pt: PromotionTypeId =
    promotion.promotionType === "free_shipping"
      ? "free_shipping"
      : promotion.promotionType === "cheapest_item_percent"
        ? "cheapest_item_percent"
        : "order_discount";

  const shopShip = await getShopShippingSettings();

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm text-[#6b7280]">
        <Link href="/admin/promotions" className="font-medium text-primary hover:underline">
          ← Zurück zu Promotions
        </Link>
      </p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Promotion bearbeiten</h1>
      <p className="mt-2 text-sm text-[#6b7280]">{promotion.title}</p>
      <div className="mt-8">
        <PromotionForm
          promotionType={pt}
          initialPromotion={promotion}
          availableShippingCountryCodes={shopShip.shippingCountryCodes}
        />
      </div>
    </div>
  );
}
