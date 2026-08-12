import type { Metadata } from "next";
import { headers } from "next/headers";
import { AiSettingsPanel } from "./ai-settings-panel";
import { InstagramConnectPanel } from "./instagram-connect-panel";
import { InternetmarkeSettingsPanel } from "./internetmarke-settings-panel";
import { SearchIndexPanel } from "./search-index-panel";
import { ZettleSettingsPanel } from "./zettle-settings-panel";
import { getSearchIndexStatusPublic } from "@/features/catalog/server";
import { getInternetmarkeConnectionPublic } from "@/features/fulfillment";
import {
  formatEstimatedCostUsd,
  getAiContentSettingsPublic,
  getAiContentUsageSummary,
  listRecentAiContentGenerationEvents,
} from "@/features/integrations";
import {
  buildZettleApiKeyDeepLink,
  getZettleConfigDiagnostics,
  getZettleConnectionPublic,
  listRecentZettleInventoryPushes,
  listRecentZettlePurchaseSyncs,
  listShopVariantsForZettleMapping,
} from "@/features/inventory";
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
  const zettleDiagnostics = getZettleConfigDiagnostics();

  const [
    igConnection,
    igCache,
    im,
    zettle,
    mappings,
    recentSyncs,
    recentPushes,
    ai,
    recentAiEvents,
    searchIndex,
  ] = await Promise.all([
      getInstagramConnectionPublic(),
      listActiveInstagramMediaCache(48),
      getInternetmarkeConnectionPublic(),
      getZettleConnectionPublic(),
      listShopVariantsForZettleMapping(),
      listRecentZettlePurchaseSyncs(15).catch(() => []),
      listRecentZettleInventoryPushes(15).catch(() => []),
      getAiContentSettingsPublic(),
      listRecentAiContentGenerationEvents(15).catch(() => []),
      getSearchIndexStatusPublic(),
    ]);

  const aiUsage = await getAiContentUsageSummary({
    requestsUsedToday: ai.requestsUsedToday,
    dailyRequestLimit: ai.dailyRequestLimit,
  });

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
          Versandkosten pflegst du unter Marketing bzw. Versand. POS-Bestand läuft über Zettle.
          KI-Entwürfe für Produkttexte konfigurierst du hier.
        </p>
      </div>

      <AiSettingsPanel
        configured={ai.configured}
        enabled={ai.enabled}
        ready={ai.ready}
        hasDbApiKey={ai.hasDbApiKey}
        envApiKeyConfigured={ai.envApiKeyConfigured}
        apiKeyMasked={ai.apiKeyMasked}
        textModel={ai.textModel}
        visionModel={ai.visionModel}
        imageModel={ai.imageModel}
        moderationModel={ai.moderationModel}
        timeoutMs={ai.timeoutMs}
        dailyRequestLimit={ai.dailyRequestLimit}
        requestsUsedToday={ai.requestsUsedToday}
        successToday={aiUsage.successToday}
        failureToday={aiUsage.failureToday}
        tokensToday={aiUsage.tokensToday}
        estimatedCostMicrosToday={aiUsage.estimatedCostMicrosToday}
        estimatedCostLabel={formatEstimatedCostUsd(aiUsage.estimatedCostMicrosToday)}
        lastVerifiedAt={ai.lastVerifiedAt?.toISOString() ?? null}
        lastError={ai.lastError}
        recentEvents={recentAiEvents.map((ev) => ({
          id: ev.id,
          createdAt: ev.createdAt,
          capability: ev.capability,
          status: ev.status,
          errorCode: ev.errorCode,
          errorMessage: ev.errorMessage,
          model: ev.model,
          totalTokens: ev.totalTokens,
          estimatedCostMicros: ev.estimatedCostMicros,
        }))}
      />

      <SearchIndexPanel
        embeddingConfigured={searchIndex.embeddingConfigured}
        embeddingProvider={searchIndex.embeddingProvider}
        embeddingModel={searchIndex.embeddingModel}
        documentsTotal={searchIndex.documentsTotal}
        documentsIndexed={searchIndex.documentsIndexed}
        documentsPending={searchIndex.documentsPending}
        documentsError={searchIndex.documentsError}
        documentsExcluded={searchIndex.documentsExcluded}
        activeProductsWithoutDocument={searchIndex.activeProductsWithoutDocument}
        lastRebuildStartedAt={searchIndex.lastRebuildStartedAt?.toISOString() ?? null}
        lastRebuildFinishedAt={searchIndex.lastRebuildFinishedAt?.toISOString() ?? null}
        lastRebuildError={searchIndex.lastRebuildError}
        operatorHint={searchIndex.operatorHint}
      />

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

      <ZettleSettingsPanel
        connected={zettle.connected}
        verified={zettle.verified}
        organizationUuid={zettle.organizationUuid}
        clientIdMasked={zettle.clientIdMasked}
        connectedAt={zettle.connectedAt?.toISOString() ?? null}
        lastVerifiedAt={zettle.lastVerifiedAt?.toISOString() ?? null}
        lastPurchaseSyncAt={zettle.lastPurchaseSyncAt?.toISOString() ?? null}
        lastSyncError={zettle.lastSyncError}
        attributionClientIdMasked={zettle.attributionClientIdMasked}
        apiKeyDeepLink={zettleDiagnostics.apiKeyDeepLink || buildZettleApiKeyDeepLink()}
        webhookConfigured={zettle.webhookConfigured}
        webhookDestination={zettle.webhookDestination}
        mappings={mappings.map((m) => ({
          productVariantId: m.productVariantId,
          productTitle: m.productTitle,
          variantTitle: m.variantTitle,
          sku: m.sku,
          stockQuantity: m.stockQuantity,
          availableQuantity: m.availableQuantity,
          zettleProductUuid: m.zettleProductUuid,
          zettleVariantUuid: m.zettleVariantUuid,
          zettleProductName: m.zettleProductName,
          zettleVariantName: m.zettleVariantName,
        }))}
        recentSyncs={recentSyncs.map((s) => ({
          purchaseUuid: s.purchaseUuid,
          purchaseNumber: s.purchaseNumber,
          purchasedAt: s.purchasedAt?.toISOString() ?? null,
          status: s.status,
          isRefund: s.isRefund,
          lastError: s.lastError,
        }))}
        recentPushes={recentPushes.map((p) => ({
          correlationId: p.correlationId,
          orderId: p.orderId,
          kind: p.kind,
          status: p.status,
          lastError: p.lastError,
          processedAt: p.processedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
