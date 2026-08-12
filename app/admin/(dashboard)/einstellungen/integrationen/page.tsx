import type { Metadata } from "next";
import { headers } from "next/headers";
import { InstagramConnectPanel } from "./instagram-connect-panel";
import { InternetmarkeSettingsPanel } from "./internetmarke-settings-panel";
import { getInternetmarkeConnectionPublic } from "@/features/fulfillment";
import { getInstagramConfigDiagnostics } from "@/lib/instagram/config";
import { getInstagramConnectionPublic } from "@/lib/instagram/connection";
import { listActiveInstagramMediaCache } from "@/lib/instagram/media-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Integrationen",
};

export default async function AdminIntegrationenPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string; msg?: string }>;
}) {
  const { ig, msg } = await searchParams;
  const headerList = await headers();
  const requestOrigin = (() => {
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    if (!host) return null;
    return `${proto.split(",")[0]?.trim()}://${host.split(",")[0]?.trim()}`.replace(/\/$/, "");
  })();
  const igDiagnostics = getInstagramConfigDiagnostics(requestOrigin);

  const [igConnection, igCache, im] = await Promise.all([
    getInstagramConnectionPublic(),
    listActiveInstagramMediaCache(48),
    getInternetmarkeConnectionPublic(),
  ]);

  const igFlash =
    ig === "connected" || ig === "error"
      ? {
          kind: (ig === "connected" ? "ok" : "error") as "ok" | "error",
          message: msg?.trim() || (ig === "connected" ? "Instagram verbunden." : "Fehler"),
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Integrationen</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Externe Dienste verbinden. Marken kaufen bleibt an der Bestellung; Feed-Inhalte und
          Versandkosten pflegst du unter Marketing bzw. Versand.
        </p>
      </div>

      <InstagramConnectPanel
        configured={igDiagnostics.configured}
        connected={igConnection.connected}
        username={igConnection.username}
        connectedAt={igConnection.connectedAt?.toISOString() ?? null}
        lastSyncAt={igConnection.lastSyncAt?.toISOString() ?? null}
        lastSyncError={igConnection.lastSyncError}
        tokenExpiresAt={igConnection.tokenExpiresAt?.toISOString() ?? null}
        cachedCount={igCache.length}
        appIdMasked={igDiagnostics.appIdMasked}
        redirectUri={igDiagnostics.redirectUri}
        metaAppDomain={igDiagnostics.metaAppDomain}
        connectAdminUrl={igDiagnostics.connectAdminUrl}
        oauthReady={igDiagnostics.oauthReady}
        oauthBlockReason={igDiagnostics.oauthBlockReason}
        authMode={igDiagnostics.authMode}
        facebookConfigId={igDiagnostics.facebookConfigId}
        flash={igFlash}
      />

      <InternetmarkeSettingsPanel
        connected={im.connected}
        verified={im.verified}
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
