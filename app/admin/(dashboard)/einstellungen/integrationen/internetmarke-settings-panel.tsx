"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  disconnectInternetmarkeAction,
  loadInternetmarkeProductsAction,
  saveInternetmarkeCredentialsAction,
  selectInternetmarkeProductAction,
  type InternetmarkeAdminActionState,
} from "@/app/admin/(dashboard)/einstellungen/integrationen/internetmarke-actions";

type ProductOption = {
  productCode: number;
  name: string;
  priceCents: number;
  transport: string;
  maxWeightG: number | null;
};

type Props = {
  connected: boolean;
  verified: boolean;
  readyForPurchase: boolean;
  appCredentialsConfigured: boolean;
  clientIdMasked: string | null;
  username: string | null;
  productCode: number | null;
  productPriceCents: number | null;
  productNameSnapshot: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
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

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export function InternetmarkeSettingsPanel(props: Props) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(
    saveInternetmarkeCredentialsAction,
    null as InternetmarkeAdminActionState,
  );
  const [loadState, loadAction, loadPending] = useActionState(
    loadInternetmarkeProductsAction,
    null as InternetmarkeAdminActionState,
  );
  const [selectState, selectAction, selectPending] = useActionState(
    selectInternetmarkeProductAction,
    null as InternetmarkeAdminActionState,
  );
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectInternetmarkeAction,
    null as InternetmarkeAdminActionState,
  );

  const products: ProductOption[] = loadState?.products ?? [];

  useEffect(() => {
    if (saveState?.ok || selectState?.ok || disconnectState?.ok) {
      router.refresh();
    }
  }, [saveState?.ok, selectState?.ok, disconnectState?.ok, router]);

  const error =
    saveState?.error || loadState?.error || selectState?.error || disconnectState?.error;
  const message =
    saveState?.message || loadState?.message || selectState?.message || disconnectState?.message;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1f2937]">Internetmarke</h2>
      <p className="mt-2 text-sm text-[#6b7280]">
        API Key und Secret kommen aus der Env (wie Instagram-App-Credentials). Hier nur Portokasse
        verbinden — Produktcode und Preis lädt die Products API.
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
        {props.lastError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Letzter Hinweis: {props.lastError}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-1 rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280]">
        <p>
          Developer-Portal (Env):{" "}
          {props.appCredentialsConfigured ? (
            <span className="font-medium text-[#374151]">
              gesetzt · API Key <code className="text-[11px]">{props.clientIdMasked}</code>
            </span>
          ) : (
            <span className="font-medium text-amber-800">
              fehlt — bitte{" "}
              <code className="text-[11px]">INTERNETMARKE_CLIENT_ID</code> und{" "}
              <code className="text-[11px]">INTERNETMARKE_CLIENT_SECRET</code> setzen
            </span>
          )}
        </p>
        {props.connected ? (
          <>
            <p>
              Status:{" "}
              <span className="font-medium text-[#374151]">
                {props.verified
                  ? props.readyForPurchase
                    ? "Bereit für Label-Kauf"
                    : "Token OK — Produkt wählen"
                  : "Login gespeichert, Token-Prüfung fehlgeschlagen"}
              </span>
              {" · "}
              Portokasse: {props.username ?? "—"}
            </p>
            <p>Zuletzt geprüft: {formatDe(props.lastVerifiedAt)}</p>
            {props.verified &&
            props.productNameSnapshot &&
            props.productCode != null &&
            props.productPriceCents != null ? (
              <p className="text-[#374151]">
                Aktives Produkt:{" "}
                <span className="font-medium">
                  {props.productNameSnapshot} (Code {props.productCode},{" "}
                  {formatEuro(props.productPriceCents)})
                </span>
              </p>
            ) : props.verified ? (
              <p>Noch kein Porto-Produkt ausgewählt.</p>
            ) : null}
          </>
        ) : null}
      </div>

      <form action={saveAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="im-username" className="mb-1 block text-sm font-medium text-[#374151]">
            Portokasse-Benutzername (E-Mail)
          </label>
          <input
            id="im-username"
            name="username"
            type="email"
            required
            defaultValue={props.username ?? ""}
            disabled={!props.appCredentialsConfigured}
            className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-[#f3f4f6] disabled:opacity-70"
          />
        </div>
        <div>
          <label htmlFor="im-password" className="mb-1 block text-sm font-medium text-[#374151]">
            Portokasse-Passwort
          </label>
          <input
            id="im-password"
            name="password"
            type="password"
            autoComplete="new-password"
            maxLength={22}
            disabled={!props.appCredentialsConfigured}
            placeholder={props.connected ? "Leer lassen = unverändert" : "max. 22 Zeichen"}
            className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-[#f3f4f6] disabled:opacity-70"
          />
        </div>
        <button
          type="submit"
          disabled={savePending || !props.appCredentialsConfigured}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {savePending
            ? "Prüfe Verbindung…"
            : props.connected
              ? "Portokasse aktualisieren"
              : "Verbinden & prüfen"}
        </button>
      </form>

      {props.connected && props.verified ? (
        <div className="mt-8 space-y-4 border-t border-[#e8eaed] pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <form action={loadAction}>
              <button
                type="submit"
                disabled={loadPending || !props.appCredentialsConfigured}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
              >
                {loadPending ? "Lade Produkte…" : "Porto-Produkte von DHL laden"}
              </button>
            </form>
            <p className="text-xs text-[#6b7280]">
              Aktuelle Codes und Preise aus der Products API (Profil IM-PARTNER).
            </p>
          </div>

          {products.length > 0 ? (
            <form action={selectAction} className="space-y-3">
              <label htmlFor="im-product" className="block text-sm font-medium text-[#374151]">
                Standardprodukt für Label-Kauf
              </label>
              <select
                id="im-product"
                name="productCode"
                required
                defaultValue={props.productCode ?? ""}
                className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="" disabled>
                  Produkt wählen…
                </option>
                {products.map((p) => (
                  <option key={p.productCode} value={p.productCode}>
                    {p.name} — {formatEuro(p.priceCents)}
                    {p.transport === "international" ? " (int.)" : ""}
                    {p.maxWeightG != null ? ` · bis ${p.maxWeightG} g` : ""}
                    {` · Code ${p.productCode}`}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={selectPending}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
              >
                {selectPending ? "Speichere…" : "Produkt übernehmen"}
              </button>
            </form>
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
