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
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Einstellungen</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Shopname, Markenfarben, Kontakt und Branding-Medien — eine Konfiguration für Storefront,
          Login, E-Mail und PDF (Anbindung folgt). Gespeicherte Werte kommen vom Server.
        </p>
      </div>
      <ShopSettingsForm
        key={defaults.updatedAt?.toISOString() ?? "seed"}
        defaults={defaults}
      />
    </div>
  );
}
