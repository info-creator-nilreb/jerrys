"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteZettleMappingAction,
  disconnectZettleAction,
  loadZettleProductsAction,
  retryZettlePurchaseSyncAction,
  saveZettleApiKeyAction,
  saveZettleMappingAction,
  syncZettlePurchasesAction,
  type ZettleAdminActionState,
} from "@/app/admin/(dashboard)/einstellungen/integrationen/zettle-actions";

type MappingRow = {
  productVariantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string;
  stockQuantity: number;
  availableQuantity: number;
  zettleProductUuid: string | null;
  zettleVariantUuid: string | null;
  zettleProductName: string | null;
  zettleVariantName: string | null;
};

type SyncRow = {
  purchaseUuid: string;
  purchaseNumber: number | null;
  purchasedAt: string | null;
  status: string;
  isRefund: boolean;
  lastError: string | null;
};

type ZettleProductOption = {
  uuid: string;
  name: string;
  variants: Array<{ uuid: string; name: string | null; sku: string | null }>;
};

type Props = {
  connected: boolean;
  verified: boolean;
  organizationUuid: string | null;
  clientIdMasked: string | null;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
  lastPurchaseSyncAt: string | null;
  lastSyncError: string | null;
  attributionClientIdMasked: string | null;
  apiKeyDeepLink: string;
  mappings: MappingRow[];
  recentSyncs: SyncRow[];
};

function formatDe(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "processed":
      return "verbucht";
    case "skipped":
      return "übersprungen";
    case "failed":
      return "fehlgeschlagen";
    case "pending_retry":
      return "Retry ausstehend";
    default:
      return status;
  }
}

export function ZettleSettingsPanel(props: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<ZettleProductOption[]>([]);
  const [saveState, saveAction, savePending] = useActionState(
    saveZettleApiKeyAction,
    null as ZettleAdminActionState,
  );
  const [loadState, loadAction, loadPending] = useActionState(
    loadZettleProductsAction,
    null as ZettleAdminActionState,
  );
  const [mapState, mapAction, mapPending] = useActionState(
    saveZettleMappingAction,
    null as ZettleAdminActionState,
  );
  const [unmapState, unmapAction, unmapPending] = useActionState(
    deleteZettleMappingAction,
    null as ZettleAdminActionState,
  );
  const [syncState, syncAction, syncPending] = useActionState(
    syncZettlePurchasesAction,
    null as ZettleAdminActionState,
  );
  const [retryState, retryAction, retryPending] = useActionState(
    retryZettlePurchaseSyncAction,
    null as ZettleAdminActionState,
  );
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectZettleAction,
    null as ZettleAdminActionState,
  );

  useEffect(() => {
    if (loadState?.products?.length) {
      setProducts(loadState.products);
    }
  }, [loadState?.products]);

  useEffect(() => {
    if (
      saveState?.ok ||
      mapState?.ok ||
      unmapState?.ok ||
      syncState?.ok ||
      retryState?.ok ||
      disconnectState?.ok
    ) {
      router.refresh();
    }
  }, [
    saveState?.ok,
    mapState?.ok,
    unmapState?.ok,
    syncState?.ok,
    retryState?.ok,
    disconnectState?.ok,
    router,
  ]);

  const error =
    saveState?.error ||
    loadState?.error ||
    mapState?.error ||
    unmapState?.error ||
    syncState?.error ||
    retryState?.error ||
    disconnectState?.error;
  const message =
    saveState?.message ||
    loadState?.message ||
    mapState?.message ||
    unmapState?.message ||
    syncState?.message ||
    retryState?.message ||
    disconnectState?.message;

  const variantOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    for (const p of products) {
      for (const v of p.variants) {
        const productName = p.name.replaceAll("::", " ");
        const variantName = (v.name ?? "").replaceAll("::", " ");
        opts.push({
          value: `${p.uuid}::${v.uuid}::${productName}::${variantName}`,
          label: `${p.name}${v.name ? ` — ${v.name}` : ""}${v.sku ? ` (${v.sku})` : ""}`,
        });
      }
    }
    return opts;
  }, [products]);

  const mappedCount = props.mappings.filter((m) => m.zettleVariantUuid).length;
  const failedSyncs = props.recentSyncs.filter((s) => s.status === "failed").length;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1f2937]">Zettle POS</h2>
      <p className="mt-2 text-sm text-[#6b7280]">
        Private Integration per API-Key (Assertion Grant). Der Shop bleibt Bestands-Quelle;
        POS-Käufe werden idempotent abgebucht — Zettle überschreibt den Shop-Bestand nicht.
      </p>

      <div aria-live="polite" className="mt-4 space-y-2">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message && !error ? (
          <p className="text-sm font-medium text-primary" role="status">
            {message}
          </p>
        ) : null}
        {props.lastSyncError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Letzter Hinweis: {props.lastSyncError}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-1 rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280]">
        <p>
          API-Key anlegen:{" "}
          <a
            href={props.apiKeyDeepLink}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            my.zettle.com → API-Keys
          </a>
          {" · "}
          Scopes: <code className="text-[11px]">READ:PRODUCT READ:PURCHASE</code>
        </p>
        {props.attributionClientIdMasked ? (
          <p>
            Attribution (Env <code className="text-[11px]">ZETTLE_CLIENT_ID</code>):{" "}
            <code className="text-[11px]">{props.attributionClientIdMasked}</code>
          </p>
        ) : (
          <p>
            Optional: <code className="text-[11px]">ZETTLE_CLIENT_ID</code> in der Env für
            Developer-Portal-Attribution.
          </p>
        )}
        {props.connected ? (
          <>
            <p>
              Status:{" "}
              <span className="font-medium text-[#374151]">
                {props.verified ? "Verbunden & geprüft" : "Gespeichert, Prüfung fehlgeschlagen"}
              </span>
              {props.organizationUuid ? (
                <>
                  {" · "}
                  Org: <code className="text-[11px]">{props.organizationUuid}</code>
                </>
              ) : null}
            </p>
            <p>
              Client: <code className="text-[11px]">{props.clientIdMasked ?? "—"}</code>
              {" · "}
              Geprüft: {formatDe(props.lastVerifiedAt)}
              {" · "}
              Kauf-Sync: {formatDe(props.lastPurchaseSyncAt)}
            </p>
            <p>
              Mappings: {mappedCount}/{props.mappings.length}
              {failedSyncs > 0 ? ` · ${failedSyncs} Sync-Fehler` : ""}
            </p>
          </>
        ) : null}
      </div>

      <form action={saveAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="zettle-api-key" className="mb-1 block text-sm font-medium text-[#374151]">
            Zettle API-Key (JWT)
          </label>
          <input
            id="zettle-api-key"
            name="apiKey"
            type="password"
            autoComplete="off"
            required={!props.connected}
            placeholder={props.connected ? "Neuen Key einfügen zum Aktualisieren" : "eyJ…"}
            className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={savePending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {savePending ? "Prüfe Verbindung…" : props.connected ? "API-Key aktualisieren" : "Verbinden & prüfen"}
        </button>
      </form>

      {props.connected && props.verified ? (
        <div className="mt-8 space-y-6 border-t border-[#e8eaed] pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <form action={loadAction}>
              <button
                type="submit"
                disabled={loadPending}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
              >
                {loadPending ? "Lade Katalog…" : "Zettle-Produkte laden"}
              </button>
            </form>
            <form action={syncAction}>
              <button
                type="submit"
                disabled={syncPending}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
              >
                {syncPending ? "Synchronisiere…" : "Käufe synchronisieren"}
              </button>
            </form>
            {failedSyncs > 0 ? (
              <form action={retryAction}>
                <button
                  type="submit"
                  disabled={retryPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
                >
                  {retryPending ? "Retry…" : "Fehler erneut versuchen"}
                </button>
              </form>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1f2937]">Varianten-Mapping</h3>
            <p className="mt-1 text-xs text-[#6b7280]">
              Shop-Variante einer Zettle-Variante zuordnen. Unmapped POS-Zeilen werden nicht
              abgebucht (Alert statt stillem Überschreiben).
            </p>

            {props.mappings.length === 0 ? (
              <p className="mt-3 text-sm text-[#6b7280]">Keine aktiven Shop-Varianten.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {props.mappings.map((row) => (
                  <li
                    key={row.productVariantId}
                    className="rounded-md border border-[#e8eaed] bg-[#fafbfc] p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-[#1f2937]">
                        {row.productTitle}
                        {row.variantTitle ? ` — ${row.variantTitle}` : ""}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        SKU {row.sku} · Lager {row.stockQuantity} · verfügb. {row.availableQuantity}
                      </p>
                    </div>
                    {row.zettleVariantUuid ? (
                      <p className="mt-1 text-xs text-[#374151]">
                        Gemappt: {row.zettleProductName ?? "Produkt"}
                        {row.zettleVariantName ? ` / ${row.zettleVariantName}` : ""}{" "}
                        <code className="text-[10px] text-[#6b7280]">{row.zettleVariantUuid}</code>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-800">Noch nicht gemappt</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {variantOptions.length > 0 ? (
                        <form action={mapAction} className="flex min-w-[16rem] flex-1 flex-wrap items-end gap-2">
                          <input type="hidden" name="productVariantId" value={row.productVariantId} />
                          <div className="min-w-[12rem] flex-1">
                            <label
                              htmlFor={`zettle-map-${row.productVariantId}`}
                              className="mb-1 block text-xs font-medium text-[#374151]"
                            >
                              Zettle-Variante
                            </label>
                            <select
                              id={`zettle-map-${row.productVariantId}`}
                              name="zettleSelection"
                              required
                              className="h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Produkt wählen…
                              </option>
                              {variantOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="submit"
                            disabled={mapPending}
                            className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
                          >
                            Zuordnen
                          </button>
                        </form>
                      ) : (
                        <p className="text-xs text-[#6b7280]">
                          Zuerst „Zettle-Produkte laden“, um per Auswahl zu mappen.
                        </p>
                      )}
                      {row.zettleVariantUuid ? (
                        <form action={unmapAction}>
                          <input type="hidden" name="productVariantId" value={row.productVariantId} />
                          <button
                            type="submit"
                            disabled={unmapPending}
                            className="inline-flex h-10 items-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Mapping lösen
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {props.recentSyncs.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-[#1f2937]">Letzte Sync-Einträge</h3>
              <ul className="mt-3 divide-y divide-[#e8eaed] rounded-md border border-[#e8eaed]">
                {props.recentSyncs.map((s) => (
                  <li key={s.purchaseUuid} className="px-3 py-2 text-xs text-[#6b7280]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-[#374151]">
                        #{s.purchaseNumber ?? "—"}{" "}
                        {s.isRefund ? "(Retoure)" : ""} · {statusLabel(s.status)}
                      </span>
                      <span>{formatDe(s.purchasedAt)}</span>
                    </div>
                    <p className="mt-0.5 break-all font-mono text-[10px]">{s.purchaseUuid}</p>
                    {s.lastError ? (
                      <p className="mt-1 text-amber-900">{s.lastError}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form action={disconnectAction}>
            <button
              type="submit"
              disabled={disconnectPending}
              className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {disconnectPending ? "Trenne…" : "Verbindung trennen"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
