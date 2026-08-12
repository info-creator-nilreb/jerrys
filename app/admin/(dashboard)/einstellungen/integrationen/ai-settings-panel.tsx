"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  clearAiContentApiKeyAction,
  saveAiContentSettingsAction,
  type AiAdminActionState,
} from "@/app/admin/(dashboard)/einstellungen/integrationen/ai-actions";

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
  const limitLabel =
    props.dailyRequestLimit <= 0
      ? "unbegrenzt"
      : `${props.requestsUsedToday} / ${props.dailyRequestLimit} (UTC)`;

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

      <div className="mt-4 space-y-1 rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280]">
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
        <p>Tageskontingent: {limitLabel}</p>
        <p>Zuletzt geprüft: {formatDe(props.lastVerifiedAt)}</p>
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
    </section>
  );
}
