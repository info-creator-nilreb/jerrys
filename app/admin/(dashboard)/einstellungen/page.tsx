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
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Branding</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Logos, Farben, Texte und Social Links — eine Konfiguration für Shop, Login, E-Mail und PDF.
          Gespeicherte Werte kommen vom Server.
        </p>
      </div>
      <ShopSettingsForm
        key={defaults.updatedAt?.toISOString() ?? "seed"}
        defaults={defaults}
      />
    </div>
  );
}
