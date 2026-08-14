"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, startTransition } from "react";
import {
  saveInfoBannerAction,
  type InfoBannerFormState,
} from "@/app/admin/(dashboard)/inhalte/info-banner/actions";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";
import {
  INFO_BANNER_DURATIONS_SEC,
  INFO_BANNER_MAX_MESSAGES,
  INFO_BANNER_MESSAGE_MAX_LEN,
  resolveInfoBannerBgColor,
  resolveInfoBannerFgColor,
} from "@/lib/shop/info-banner";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2.5 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

type BgMode = "primary" | "custom";

type Props = {
  defaults: {
    active: boolean;
    messages: string[];
    durationSec: number;
    href: string | null;
    bgColor: string | null;
    primaryColor: string;
  };
};

const initial: InfoBannerFormState = null;

export function InfoBannerForm({ defaults }: Props) {
  const [state, formAction, pending] = useActionState(saveInfoBannerAction, initial);
  const [active, setActive] = useState(defaults.active);
  const [messages, setMessages] = useState<string[]>(() =>
    defaults.messages.length > 0 ? [...defaults.messages] : [""],
  );
  const [durationSec, setDurationSec] = useState(defaults.durationSec);
  const [href, setHref] = useState(defaults.href ?? "");
  const [bgMode, setBgMode] = useState<BgMode>(defaults.bgColor ? "custom" : "primary");
  const [customBg, setCustomBg] = useState(
    defaults.bgColor ?? defaults.primaryColor,
  );

  // Nur aus dem Action-Ergebnis syncen — nicht aus defaults nach Refresh,
  // sonst kann ein kurzlebig stale Cache den Haken wieder entfernen.
  useEffect(() => {
    if (!state?.ok || !state.saved) return;
    startTransition(() => {
      setActive(state.saved.active);
      setMessages(state.saved.messages.length > 0 ? [...state.saved.messages] : [""]);
      setDurationSec(state.saved.durationSec);
      setHref(state.saved.href ?? "");
      setBgMode(state.saved.bgColor ? "custom" : "primary");
      if (state.saved.bgColor) {
        setCustomBg(state.saved.bgColor);
      } else {
        setCustomBg(defaults.primaryColor);
      }
    });
  }, [state, defaults.primaryColor]);

  const fe = state?.fieldErrors ?? {};
  const previewBg = resolveInfoBannerBgColor(
    bgMode === "custom" ? customBg : null,
    defaults.primaryColor,
  );
  const previewFg = resolveInfoBannerFgColor(previewBg);
  const customHex = /^#[0-9a-fA-F]{6}$/.test(customBg) ? customBg : defaults.primaryColor;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="infoBannerActive" value={active ? "true" : "false"} />
      <input
        type="hidden"
        name="infoBannerBgColor"
        value={bgMode === "primary" ? "primary" : customBg}
      />

      <div className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="checkbox-primary mt-0.5 size-4"
            aria-label="Info-Banner aktiv"
          />
          <span>
            <span className="font-medium">Info-Banner aktiv</span>
            <span className="mt-0.5 block text-xs text-[#6b7280]">
              Erscheint siteweit über dem Header — z. B. Versandhinweise oder Aktionen.
            </span>
          </span>
        </label>

        <div className="mt-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-[#1f2937]">Texte (max. {INFO_BANNER_MAX_MESSAGES})</p>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Mehrere Texte rotieren automatisch. Leere Zeilen werden ignoriert.
            </p>
          </div>
          {fe.messages ? <p className="text-sm text-red-600">{fe.messages}</p> : null}
          <ul className="space-y-3">
            {messages.map((msg, index) => (
              <li key={index} className="flex items-start gap-2">
                <label className="min-w-0 flex-1 text-sm text-[#5c5f66]">
                  Text {index + 1}
                  <input
                    className={fieldClass}
                    name={`message${index}`}
                    value={msg}
                    maxLength={INFO_BANNER_MESSAGE_MAX_LEN}
                    placeholder="z. B. Ab 59 Euro versandkostenfrei in D"
                    onChange={(e) => {
                      const next = [...messages];
                      next[index] = e.target.value;
                      setMessages(next);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="mt-7 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40"
                  aria-label={`Text ${index + 1} entfernen`}
                  disabled={messages.length <= 1}
                  onClick={() => setMessages(messages.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" aria-hidden strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
          {messages.length < INFO_BANNER_MAX_MESSAGES ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              onClick={() => setMessages([...messages, ""])}
            >
              <Plus className="size-4" aria-hidden strokeWidth={1.75} />
              Weiteren Text hinzufügen
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-[#5c5f66]">
            Anzeigedauer pro Text
            <select
              className={fieldClass}
              name="infoBannerDurationSec"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
            >
              {INFO_BANNER_DURATIONS_SEC.map((sec) => (
                <option key={sec} value={sec}>
                  {sec} Sekunden
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#6b7280]">
              Wirkt nur, wenn mindestens zwei Texte gesetzt sind.
            </span>
          </label>
          <label className="text-sm text-[#5c5f66]">
            Optionaler Link
            <input
              className={fieldClass}
              name="infoBannerHref"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/versand oder https://…"
            />
            {fe.infoBannerHref ? (
              <span className="mt-1 block text-sm text-red-600">{fe.infoBannerHref}</span>
            ) : (
              <span className="mt-1 block text-xs text-[#6b7280]">
                Interner Pfad oder HTTPS — macht die gesamte Bannerzeile klickbar.
              </span>
            )}
          </label>
        </div>

        <fieldset className="mt-6 space-y-3 border-t border-[#e8eaed] pt-6">
          <legend className="text-sm font-medium text-[#1f2937]">Hintergrundfarbe</legend>
          <p className="text-xs text-[#6b7280]">
            Standard ist die Shop-Primärfarbe. Optional eine eigene Farbe wählen.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-[#374151]">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={bgMode === "primary"}
                onChange={() => setBgMode("primary")}
                className="size-4 accent-primary"
              />
              Primärfarbe (Standard)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={bgMode === "custom"}
                onChange={() => setBgMode("custom")}
                className="size-4 accent-primary"
              />
              Eigene Farbe
            </label>
          </div>
          {bgMode === "custom" ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-3">
              <label className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#d2d5d9] shadow-sm">
                <span className="absolute inset-0" style={{ backgroundColor: customHex }} aria-hidden />
                <input
                  type="color"
                  aria-label="Banner-Hintergrund wählen"
                  value={customHex}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <input
                value={customBg}
                onChange={(e) => setCustomBg(e.target.value)}
                pattern="#[0-9A-Fa-f]{6}"
                aria-label="Banner-Hintergrund Hex"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-sm text-[#6b7280] outline-none focus:text-[#1f2937]"
              />
            </div>
          ) : null}
          {fe.infoBannerBgColor ? (
            <p className="text-sm text-red-600">{fe.infoBannerBgColor}</p>
          ) : null}
          <div
            className="rounded-md px-4 py-2 text-center text-xs font-medium tracking-wide sm:text-sm"
            style={{ backgroundColor: previewBg, color: previewFg }}
            aria-hidden
          >
            Vorschau: Ab 59 Euro versandkostenfrei
          </div>
        </fieldset>

        {state?.ok ? (
          <p className="mt-4 text-sm text-emerald-700" role="status">
            Gespeichert.
          </p>
        ) : null}
        {state?.error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>

      <AdminFormActionDock>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </AdminFormActionDock>
    </form>
  );
}
