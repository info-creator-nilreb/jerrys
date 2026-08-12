"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  clearAiContentApiKeyAction,
  saveAiContentSettingsAction,
  type AiAdminActionState,
} from "@/app/admin/(dashboard)/einstellungen/integrationen/ai-actions";

type AuditRow = {
  id: string;
  createdAt: string;
  capability: string;
  status: "success" | "failure";
  errorCode: string | null;
  errorMessage: string | null;
  model: string | null;
  totalTokens: number | null;
  estimatedCostMicros: number | null;
};

type Props = {
  configured: boolean;
  enabled: boolean;
  ready: boolean;
  hasDbApiKey: boolean;
  envApiKeyConfigured: boolean;
  apiKeyMasked: string | null;
  textModel: string;
  visionModel: string;
  imageModel: string;
  moderationModel: string;
  timeoutMs: number;
  dailyRequestLimit: number;
  requestsUsedToday: number;
  successToday: number;
  failureToday: number;
  tokensToday: number;
  estimatedCostMicrosToday: number;
  estimatedCostLabel: string;
  lastVerifiedAt: string | null;
  lastError: string | null;
  recentEvents: AuditRow[];
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

function capabilityLabel(cap: string): string {
  switch (cap) {
    case "text":
      return "Text";
    case "vision":
      return "Vision/Alt";
    case "image_generation":
      return "Bild";
    case "image_edit":
      return "Bildbearbeitung";
    case "moderation":
      return "Moderation";
    default:
      return cap;
  }
}

export function AiSettingsPanel(props: Props) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(
    saveAiContentSettingsAction,
    null as AiAdminActionState,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearAiContentApiKeyAction,
    null as AiAdminActionState,
  );

  useEffect(() => {
    if (saveState?.ok || clearState?.ok) {
      router.refresh();
    }
  }, [saveState?.ok, clearState?.ok, router]);

  const error = saveState?.error || clearState?.error;
  const message = saveState?.message || clearState?.message;
  const limitOpen = props.dailyRequestLimit <= 0;
  const remaining = limitOpen
    ? null
    : Math.max(0, props.dailyRequestLimit - props.requestsUsedToday);
  const usagePct = limitOpen
    ? 0
    : Math.min(
        100,
        Math.round((props.requestsUsedToday / Math.max(1, props.dailyRequestLimit)) * 100),
      );

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#1f2937]">KI-Content-Assistent</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            OpenAI für Text- und Bildentwürfe im Admin. Ausgaben sind Entwürfe und werden erst nach
            Bestätigung übernommen. Keine Kunden- oder Bestelldaten in Prompts.
          </p>
        </div>
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

      <div className="mt-4 space-y-3 rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-3 text-xs text-[#6b7280]">
        <p>
          Status:{" "}
          <span className="font-medium text-[#374151]">
            {!props.enabled
              ? "Deaktiviert"
              : props.ready
                ? "Bereit"
                : "Kein API-Key (Env oder Admin)"}
          </span>
        </p>
        <p>
          Key:{" "}
          {props.envApiKeyConfigured ? (
            <span className="font-medium text-[#374151]">
              Env <code className="text-[11px]">{props.apiKeyMasked}</code> (Vorrang)
            </span>
          ) : props.hasDbApiKey ? (
            <span className="font-medium text-[#374151]">Admin gespeichert (verschlüsselt)</span>
          ) : (
            <span className="font-medium text-amber-800">nicht gesetzt</span>
          )}
        </p>
        <p>Zuletzt geprüft: {formatDe(props.lastVerifiedAt)}</p>

        <div className="border-t border-[#e8eaed] pt-3">
          <p className="text-sm font-medium text-[#374151]">Nutzung heute (UTC)</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[#6b7280]">Anfragen</dt>
              <dd className="text-sm font-semibold tabular-nums text-[#1f2937]">
                {limitOpen
                  ? `${props.requestsUsedToday} (unbegrenzt)`
                  : `${props.requestsUsedToday} / ${props.dailyRequestLimit}`}
              </dd>
            </div>
            <div>
              <dt className="text-[#6b7280]">Verbleibend</dt>
              <dd className="text-sm font-semibold tabular-nums text-[#1f2937]">
                {limitOpen ? "—" : remaining}
              </dd>
            </div>
            <div>
              <dt className="text-[#6b7280]">Erfolg / Fehler (Audit)</dt>
              <dd className="text-sm font-semibold tabular-nums text-[#1f2937]">
                {props.successToday} / {props.failureToday}
              </dd>
            </div>
            <div>
              <dt className="text-[#6b7280]">Geschätzte Kosten</dt>
              <dd className="text-sm font-semibold tabular-nums text-[#1f2937]">
                {props.estimatedCostLabel}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[#6b7280]">Tokens (heute, soweit gemeldet)</dt>
              <dd className="text-sm font-semibold tabular-nums text-[#1f2937]">
                {props.tokensToday.toLocaleString("de-DE")}
              </dd>
            </div>
          </dl>
          {!limitOpen ? (
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e7eb]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usagePct}
              aria-label="Tageskontingent ausgeschöpft"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          ) : null}
          <p className="mt-2 text-[11px] text-[#9ca3af]">
            Kostenschätzung basiert auf groben Modellpreisen — maßgeblich ist das OpenAI-Dashboard.
          </p>
        </div>
      </div>

      <form action={saveAction} className="mt-6 space-y-4">
        <label className="flex items-center gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            name="enabled"
            value="true"
            defaultChecked={props.enabled}
            className="h-4 w-4 rounded border-[#d1d5db] text-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          KI-Assistent aktiv
        </label>

        <div>
          <label htmlFor="ai-api-key" className="mb-1 block text-sm font-medium text-[#374151]">
            OpenAI API-Key (optional, verschlüsselt)
          </label>
          <input
            id="ai-api-key"
            name="apiKey"
            type="password"
            autoComplete="new-password"
            placeholder={
              props.hasDbApiKey || props.envApiKeyConfigured
                ? "Leer lassen = unverändert / Env nutzen"
                : "sk-…"
            }
            className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="mt-1 text-xs text-[#6b7280]">
            Alternativ <code className="text-[11px]">OPENAI_API_KEY</code> in der Env — Env hat
            Vorrang vor dem Admin-Key.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ai-text-model" className="mb-1 block text-sm font-medium text-[#374151]">
              Textmodell
            </label>
            <input
              id="ai-text-model"
              name="textModel"
              required
              defaultValue={props.textModel}
              className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="ai-vision-model"
              className="mb-1 block text-sm font-medium text-[#374151]"
            >
              Vision / Alt-Text
            </label>
            <input
              id="ai-vision-model"
              name="visionModel"
              required
              defaultValue={props.visionModel}
              className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="ai-image-model"
              className="mb-1 block text-sm font-medium text-[#374151]"
            >
              Bildmodell
            </label>
            <input
              id="ai-image-model"
              name="imageModel"
              required
              defaultValue={props.imageModel}
              className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              Bearbeitung (Freistellen/Lifestyle) nutzt{" "}
              <code className="text-[11px]">gpt-image-1</code> bzw.{" "}
              <code className="text-[11px]">OPENAI_IMAGE_EDIT_MODEL</code>.
            </p>
          </div>
          <div>
            <label
              htmlFor="ai-moderation-model"
              className="mb-1 block text-sm font-medium text-[#374151]"
            >
              Moderation
            </label>
            <input
              id="ai-moderation-model"
              name="moderationModel"
              required
              defaultValue={props.moderationModel}
              className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="ai-timeout" className="mb-1 block text-sm font-medium text-[#374151]">
              Timeout (ms)
            </label>
            <input
              id="ai-timeout"
              name="timeoutMs"
              type="number"
              required
              min={5000}
              max={120000}
              defaultValue={props.timeoutMs}
              className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="ai-daily-limit" className="mb-1 block text-sm font-medium text-[#374151]">
              Tageslimit Anfragen (0 = offen)
            </label>
            <input
              id="ai-daily-limit"
              name="dailyRequestLimit"
              type="number"
              required
              min={0}
              max={100000}
              defaultValue={props.dailyRequestLimit}
              className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savePending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {savePending ? "Speichere & prüfe…" : "Speichern & prüfen"}
        </button>
      </form>

      {props.hasDbApiKey ? (
        <form action={clearAction} className="mt-6 border-t border-[#e8eaed] pt-6">
          <button
            type="submit"
            disabled={clearPending}
            className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {clearPending ? "Entferne…" : "Admin-API-Key entfernen"}
          </button>
        </form>
      ) : null}

      <div className="mt-8 border-t border-[#e8eaed] pt-6">
        <h3 className="text-sm font-semibold text-[#1f2937]">Letzte KI-Aufrufe (Audit)</h3>
        <p className="mt-1 text-xs text-[#6b7280]">
          Ohne Prompt-Inhalte oder personenbezogene Daten — nur Status, Modell und grobe Nutzung.
        </p>
        {props.recentEvents.length === 0 ? (
          <p className="mt-3 text-sm text-[#6b7280]">Noch keine Einträge.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e8eaed] rounded-md border border-[#e8eaed]">
            {props.recentEvents.map((ev) => (
              <li key={ev.id} className="px-3 py-2.5 text-xs text-[#374151]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {capabilityLabel(ev.capability)}{" "}
                    <span
                      className={
                        ev.status === "success" ? "text-primary" : "text-red-700"
                      }
                    >
                      {ev.status === "success" ? "OK" : "Fehler"}
                    </span>
                  </span>
                  <time dateTime={ev.createdAt} className="tabular-nums text-[#6b7280]">
                    {formatDe(ev.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 text-[#6b7280]">
                  {ev.model ? `Modell ${ev.model}` : "Modell —"}
                  {ev.totalTokens != null
                    ? ` · ${ev.totalTokens.toLocaleString("de-DE")} Tokens`
                    : ""}
                  {ev.estimatedCostMicros != null && ev.estimatedCostMicros > 0
                    ? ` · ≈ $${(ev.estimatedCostMicros / 1_000_000).toFixed(4)}`
                    : ""}
                </p>
                {ev.status === "failure" && ev.errorMessage ? (
                  <p className="mt-1 text-red-700">{ev.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
