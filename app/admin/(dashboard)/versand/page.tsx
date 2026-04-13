import type { Metadata } from "next";
import { ShippingSettingsForm } from "@/app/admin/(dashboard)/versand/shipping-settings-form";
import { getShopShippingSettingsForAdminForm } from "@/app/admin/(dashboard)/versand/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Versand",
};

export default async function AdminVersandPage() {
  const defaults = await getShopShippingSettingsForAdminForm();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Versand</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Lieferländer und Versandkosten gelten shopweit — nicht mehr pro Produkt. Änderungen wirken sofort im
          Checkout.
        </p>
      </div>
      <ShippingSettingsForm defaults={defaults} />
    </div>
  );
}
