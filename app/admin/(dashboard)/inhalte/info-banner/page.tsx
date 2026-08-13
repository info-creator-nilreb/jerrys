import type { Metadata } from "next";
import Link from "next/link";
import { InfoBannerForm } from "@/app/admin/(dashboard)/inhalte/info-banner/info-banner-form";
import { getShopSettings } from "@/lib/shop/shop-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Info-Banner",
};

export default async function AdminInfoBannerPage() {
  const settings = await getShopSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div>
        <Link
          href="/admin/inhalte"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Inhalte
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1f2937]">
          Info-Banner
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Schmale Hinweiszeile über dem Shop-Header — z. B. Versandkostenfrei ab … oder aktuelle
          Aktionen. Bis zu drei Texte rotieren mit einstellbarer Anzeigedauer.
        </p>
      </div>

      <InfoBannerForm
        defaults={{
          active: settings.infoBannerActive,
          messages: settings.infoBannerMessages,
          durationSec: settings.infoBannerDurationSec,
          href: settings.infoBannerHref,
        }}
      />
    </div>
  );
}
