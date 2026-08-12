import type { Metadata } from "next";
import { getShopSettingsForAdminForm } from "@/app/admin/(dashboard)/einstellungen/actions";
import { ShopSettingsForm } from "@/app/admin/(dashboard)/einstellungen/shop-settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default async function AdminEinstellungenPage() {
  const defaults = await getShopSettingsForAdminForm();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Shop</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Branding, Logos, Farben, Texte und Social Links. Änderungen werden in der Datenbank
          gespeichert; die Storefront übernimmt sie mit Epic&nbsp;11 Slice&nbsp;4.
        </p>
      </div>
      <ShopSettingsForm
        key={defaults.updatedAt?.toISOString() ?? "seed"}
        defaults={defaults}
      />
    </div>
  );
}
