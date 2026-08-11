"use client";

import { useActionState } from "react";
import {
  disconnectInstagramAction,
  syncInstagramNowAction,
  type InstagramAdminActionState,
} from "@/app/admin/(dashboard)/inhalte/marketing/instagram-actions";

type Props = {
  configured: boolean;
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  tokenExpiresAt: string | null;
  cachedCount: number;
  /** Maskierte App ID (Instagram- oder Meta-App-ID je nach Mode). */
  appIdMasked?: string | null;
  redirectUri?: string | null;
  metaAppDomain?: string | null;
  connectAdminUrl?: string | null;
  oauthReady?: boolean;
  oauthBlockReason?: string | null;
  authMode?: "instagram" | "facebook";
  /** Facebook Login for Business Config-ID (nur Mode facebook). */
  facebookConfigId?: string | null;
  flash?: { kind: "ok" | "error"; message: string } | null;
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

export function InstagramConnectPanel(props: Props) {
  const [disconnectState, disconnectAction, disconnectPending] = useActionState<
    InstagramAdminActionState,
    FormData
  >(disconnectInstagramAction, null);
  const [syncState, syncAction, syncPending] = useActionState<
    InstagramAdminActionState,
    FormData
  >(syncInstagramNowAction, null);

  const actionMsg = syncState?.message || syncState?.error || disconnectState?.message || disconnectState?.error;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1f2937]">Instagram verbinden</h2>
      <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
        OAuth mit einem Instagram Professional-Account (Business/Creator). Der Feed wird
        periodisch synchronisiert; der CMS-Block „Social / Reviews“ zeigt die Bilder im
        bestehenden Carousel (Desktop &amp; Mobile). Zunächst nur Standbilder/Carousel-Cover,
        keine Reels.
      </p>

      {props.flash ? (
        <p
          className={`mt-4 text-sm ${props.flash.kind === "ok" ? "text-green-700" : "text-red-600"}`}
          role="status"
        >
          {props.flash.message}
        </p>
      ) : null}
      {actionMsg ? (
        <p
          className={`mt-2 text-sm ${syncState?.error || disconnectState?.error ? "text-red-600" : "text-green-700"}`}
          role="status"
        >
          {actionMsg}
        </p>
      ) : null}

      {!props.configured ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          App-Credentials fehlen:{" "}
          <code className="text-xs">INSTAGRAM_APP_ID</code>,{" "}
          <code className="text-xs">INSTAGRAM_APP_SECRET</code>,{" "}
          <code className="text-xs">NEXT_PUBLIC_SITE_URL</code> oder{" "}
          <code className="text-xs">INSTAGRAM_REDIRECT_URI</code>.
        </p>
      ) : (
        <div className="mt-4 space-y-2 rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280]">
          <p>
            Auth-Mode:{" "}
            <code className="text-[11px] font-medium text-[#374151]">
              {props.authMode === "facebook" ? "facebook" : "instagram"}
            </code>
            {" · "}
            App-ID: <code className="text-[11px]">{props.appIdMasked ?? "—"}</code>
            {props.redirectUri ? (
              <>
                {" · "}
                Redirect: <code className="break-all text-[11px]">{props.redirectUri}</code>
              </>
            ) : null}
            {props.authMode === "facebook" ? (
              <>
                {" · "}
                Config-ID:{" "}
                <code className="text-[11px]">
                  {props.facebookConfigId ? props.facebookConfigId : "fehlt"}
                </code>
              </>
            ) : null}
          </p>
          {props.metaAppDomain ? (
            <div className="space-y-1 rounded border border-[#e8eaed] bg-white px-2 py-1.5 text-[11px] text-[#374151]">
              <p className="font-medium">Meta-Dashboard (facebook-Mode):</p>
              <ol className="list-decimal space-y-0.5 pl-4 text-[#6b7280]">
                <li>
                  App-Domains:{" "}
                  <code className="font-medium text-[#374151]">{props.metaAppDomain}</code>
                </li>
                <li>
                  Facebook Login for Business → Einstellungen → OAuth-Redirect:{" "}
                  <code className="break-all font-medium text-[#374151]">
                    {props.redirectUri}
                  </code>
                </li>
                <li>
                  Facebook Login for Business →{" "}
                  <span className="font-medium text-[#374151]">Konfigurationen</span>: Config
                  anlegen (Permissions u. a. <code>instagram_basic</code>,{" "}
                  <code>pages_show_list</code>) → Config-ID in Vercel als{" "}
                  <code className="font-medium text-[#374151]">INSTAGRAM_FB_LOGIN_CONFIG_ID</code>
                  {props.facebookConfigId ? (
                    <>
                      {" "}
                      (aktuell:{" "}
                      <code className="font-medium text-[#374151]">{props.facebookConfigId}</code>)
                    </>
                  ) : (
                    <> setzen und Redeploy</>
                  )}
                </li>
              </ol>
            </div>
          ) : null}
          {!props.oauthReady && props.oauthBlockReason ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900">
              {props.oauthBlockReason}
              {props.connectAdminUrl ? (
                <>
                  {" "}
                  <a href={props.connectAdminUrl} className="font-medium text-primary hover:underline">
                    Production-Admin öffnen
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          <p>
            Bei <span className="font-medium text-[#374151]">Invalid platform app</span>: Mode{" "}
            <code className="text-[11px]">facebook</code> + Meta App ID/Secret (Allgemeines). Domain-Fehler
            („nicht in den Domains der App“) = App-Domain/Redirect oben fehlen oder Verbinden über Preview —
            immer Production-Admin nutzen.
          </p>
        </div>
      )}

      <dl className="mt-4 grid gap-2 text-sm text-[#374151] sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[#9ca3af]">Status</dt>
          <dd className="font-medium">
            {props.connected ? (
              <span className="text-primary">
                Verbunden{props.username ? ` (@${props.username})` : ""}
              </span>
            ) : (
              "Nicht verbunden"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#9ca3af]">Gecachte Bilder</dt>
          <dd className="font-medium">{props.cachedCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#9ca3af]">Verbunden seit</dt>
          <dd>{formatDe(props.connectedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#9ca3af]">Letzter Sync</dt>
          <dd>{formatDe(props.lastSyncAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#9ca3af]">Token gültig bis</dt>
          <dd>{formatDe(props.tokenExpiresAt)}</dd>
        </div>
        {props.lastSyncError ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-[#9ca3af]">Letzter Sync-Fehler</dt>
            <dd className="text-red-600">{props.lastSyncError}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {props.configured && props.oauthReady !== false ? (
          <button
            type="button"
            onClick={() => {
              // Full navigation required for OAuth redirect + state cookie (not soft router push).
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- OAuth start
              window.location.assign("/api/admin/instagram/connect");
            }}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-(--primary-hover)"
          >
            {props.connected ? "Neu verbinden" : "Mit Instagram verbinden"}
          </button>
        ) : null}
        {props.connected ? (
          <>
            <form action={syncAction}>
              <button
                type="submit"
                disabled={syncPending}
                className="inline-flex min-h-11 items-center rounded-md border border-[#e3e4e8] bg-white px-4 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
              >
                {syncPending ? "Synchronisiert…" : "Jetzt synchronisieren"}
              </button>
            </form>
            <form action={disconnectAction}>
              <button
                type="submit"
                disabled={disconnectPending}
                className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {disconnectPending ? "…" : "Trennen"}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </section>
  );
}
