"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  addInternetmarkeProductPresetAction,
  disconnectInternetmarkeAction,
  loadInternetmarkeProductsAction,
  removeInternetmarkeProductPresetAction,
  saveInternetmarkeCredentialsAction,
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
  productPresets: ProductOption[];
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
  const [addState, addAction, addPending] = useActionState(
    addInternetmarkeProductPresetAction,
    null as InternetmarkeAdminActionState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeInternetmarkeProductPresetAction,
    null as InternetmarkeAdminActionState,
  );
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectInternetmarkeAction,
    null as InternetmarkeAdminActionState,
  );

  const products: ProductOption[] = addState?.products ?? loadState?.products ?? [];
  const availableProducts = products.filter(
    (p) => !props.productPresets.some((s) => s.productCode === p.productCode),
  );

  useEffect(() => {
    if (saveState?.ok || addState?.ok || removeState?.ok || disconnectState?.ok) {
      router.refresh();
    }
  }, [saveState?.ok, addState?.ok, removeState?.ok, disconnectState?.ok, router]);

  const error =
    saveState?.error ||
    addState?.error ||
    removeState?.error ||
    loadState?.error ||
    disconnectState?.error;
  const message =
    saveState?.message ||
    addState?.message ||
    removeState?.message ||
    loadState?.message ||
    disconnectState?.message;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1f2937]">Internetmarke</h2>
      <p className="mt-2 text-sm text-[#6b7280]">
        API Key und Secret kommen aus der Env (Developer Portal). Hier nur die{" "}
        <strong className="font-medium text-[#374151]">Portokasse</strong> verbinden —
        Produktcode und Preis lädt die Products API.
      </p>

      <div className="mt-4 rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-3 text-sm text-[#374151]">
        <p className="font-medium">Zwei getrennte Freigaben — Developer-Portal reicht nicht</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[#6b7280]">
          <li>
            Im DHL Developer Portal die API auf <span className="font-medium text-[#374151]">Approved</span>{" "}
            setzen und den <span className="font-medium text-[#374151]">API Key</span> (nicht App-Name)
            als <code className="text-[11px]">INTERNETMARKE_CLIENT_ID</code> hinterlegen.
          </li>
          <li>
            Hier die Portokasse-Zugangsdaten eintragen (nicht das Developer-Portal-Konto) und
            verbinden. DHL schickt dann eine E-Mail an die Portokasse-Adresse.
          </li>
          <li>
            Unter{" "}
            <a
              href="https://portokasse.deutschepost.de"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              Portokasse
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            {" → "}
            Meine Daten → Geschäftsanwendungen die App <span className="font-medium text-[#374151]">dauerhaft freigeben</span>,
            danach hier erneut verbinden. Bis dahin bleibt POST /user auf 401.
          </li>
        </ol>
      </div>

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
            {props.verified && props.productPresets.length > 0 ? (
              <p className="text-[#374151]">
                Versandauswahl:{" "}
                <span className="font-medium">
                  {props.productPresets.length} Produkt
                  {props.productPresets.length === 1 ? "" : "e"}
                </span>
              </p>
            ) : props.verified ? (
              <p>Noch keine Porto-Produkte vorgewählt (1–5 für den Versand).</p>
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
          <p className="mt-1 text-xs text-[#6b7280]">
            E-Mail der Portokasse, nicht das Login vom DHL Developer Portal.
          </p>
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
          <div>
            <h3 className="text-sm font-semibold text-[#1f2937]">Produkte für den Versand</h3>
            <p className="mt-1 text-xs text-[#6b7280]">
              Wähle 1–5 Porto-Produkte. Beim Vorbereiten einer Sendung kannst du dann eines davon
              auswählen.
            </p>
          </div>

          {props.productPresets.length > 0 ? (
            <ul className="divide-y divide-[#e8eaed] rounded-lg border border-[#e8eaed]">
              {props.productPresets.map((p) => (
                <li
                  key={p.productCode}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#374151]">{p.name}</p>
                    <p className="text-xs text-[#6b7280]">
                      {formatEuro(p.priceCents)}
                      {p.transport === "international" ? " · internat." : ""}
                      {p.maxWeightG != null ? ` · bis ${p.maxWeightG} g` : ""}
                      {` · Code ${p.productCode}`}
                    </p>
                  </div>
                  <form action={removeAction}>
                    <input type="hidden" name="productCode" value={p.productCode} />
                    <button
                      type="submit"
                      disabled={removePending}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
                      aria-label={`${p.name} aus der Versandauswahl entfernen`}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Entfernen
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">Noch keine Auswahl — Produkte laden und hinzufügen.</p>
          )}

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

          {availableProducts.length > 0 ? (
            <form action={addAction} className="space-y-3">
              <label htmlFor="im-product" className="block text-sm font-medium text-[#374151]">
                Produkt zur Versandauswahl hinzufügen
              </label>
              <select
                id="im-product"
                name="productCode"
                required
                defaultValue=""
                disabled={props.productPresets.length >= 5}
                className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-[#f3f4f6] disabled:opacity-70"
              >
                <option value="" disabled>
                  {props.productPresets.length >= 5
                    ? "Maximal 5 Produkte — zuerst eines entfernen"
                    : "Produkt wählen…"}
                </option>
                {availableProducts.map((p) => (
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
                disabled={addPending || props.productPresets.length >= 5}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
              >
                <Plus className="size-4" aria-hidden />
                {addPending ? "Füge hinzu…" : "Zur Auswahl hinzufügen"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {props.connected ? (
        <form action={disconnectAction} className="mt-8 border-t border-[#e8eaed] pt-6">
          <button
            type="submit"
            disabled={disconnectPending}
            className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {disconnectPending ? "Trenne…" : "Verbindung trennen"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
