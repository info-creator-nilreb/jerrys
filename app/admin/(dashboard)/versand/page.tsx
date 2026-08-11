import type { Metadata } from "next";
import { ShippingSettingsForm } from "@/app/admin/(dashboard)/versand/shipping-settings-form";
import { InternetmarkeSettingsPanel } from "@/app/admin/(dashboard)/versand/internetmarke-settings-panel";
import { getShopShippingSettingsForAdminForm } from "@/app/admin/(dashboard)/versand/actions";
import { getInternetmarkeConnectionPublic } from "@/features/fulfillment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Versand",
};

export default async function AdminVersandPage() {
  const [defaults, im] = await Promise.all([
    getShopShippingSettingsForAdminForm(),
    getInternetmarkeConnectionPublic(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Versand</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Lieferländer und Versandkosten gelten shopweit — nicht mehr pro Produkt. Änderungen wirken sofort im
          Checkout. Internetmarke-Credentials und Porto-Produkt verwaltest du im zweiten Block.
        </p>
      </div>
      <ShippingSettingsForm defaults={defaults} />
      <InternetmarkeSettingsPanel
        connected={im.connected}
        readyForPurchase={im.readyForPurchase}
        appCredentialsConfigured={im.appCredentialsConfigured}
        clientIdMasked={im.clientIdMasked}
        username={im.username}
        productCode={im.productCode}
        productPriceCents={im.productPriceCents}
        productNameSnapshot={im.productNameSnapshot}
        lastVerifiedAt={im.lastVerifiedAt?.toISOString() ?? null}
        lastError={im.lastError}
      />
    </div>
  );
}
