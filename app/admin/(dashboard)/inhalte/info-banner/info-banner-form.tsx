"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import {
  saveInfoBannerAction,
  type InfoBannerFormState,
} from "@/app/admin/(dashboard)/inhalte/info-banner/actions";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";
import {
  INFO_BANNER_DURATIONS_SEC,
  INFO_BANNER_MAX_MESSAGES,
  INFO_BANNER_MESSAGE_MAX_LEN,
} from "@/lib/shop/info-banner";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2.5 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

type Props = {
  defaults: {
    active: boolean;
    messages: string[];
    durationSec: number;
    href: string | null;
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

  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]">
          <input type="hidden" name="infoBannerActive" value="false" />
          <input
            type="checkbox"
            name="infoBannerActive"
            value="true"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="checkbox-primary mt-0.5 size-4"
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
