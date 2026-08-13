"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  generateProductAiTextAction,
  type GenerateProductAiTextState,
} from "@/app/admin/(dashboard)/products/ai-product-text-actions";

export type ProductAiApplyTarget = "leadText" | "descriptionHtml" | "featureBullets";

type Props = {
  aiReady: boolean;
  categoryNames: string[];
  /** Aktueller SKU-Hinweis (Default-Variante). */
  defaultSku?: string | null;
  onApply: (target: ProductAiApplyTarget, value: string) => void;
};

const KIND_OPTIONS: Array<{
  value: string;
  label: string;
  hint: string;
}> = [
  {
    value: "short_description",
    label: "Kurztext (Shop)",
    hint: "Übernahme in „Kurztext unter dem Untertitel“",
  },
  {
    value: "long_description",
    label: "Beschreibung",
    hint: "Übernahme in die Produktbeschreibung",
  },
  {
    value: "bullets",
    label: "Verkaufsargumente (USPs)",
    hint: "Übernahme in Verkaufsargumente / USPs",
  },
  {
    value: "seo_title",
    label: "SEO-Titel (Vorschau)",
    hint: "Nur Vorschau — kein Produktfeld in v1",
  },
  {
    value: "seo_description",
    label: "Meta-Description (Vorschau)",
    hint: "Nur Vorschau — kein Produktfeld in v1",
  },
];

function readFormValue(form: HTMLFormElement | null, name: string): string {
  if (!form) return "";
  const el = form.elements.namedItem(name);
  if (!el) return "";
  if (el instanceof RadioNodeList) {
    return String(el.value ?? "");
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    return el.value;
  }
  return "";
}

function fieldLabel(target: ProductAiApplyTarget | null | undefined): string {
  switch (target) {
    case "leadText":
      return "Kurztext";
    case "descriptionHtml":
      return "Beschreibung";
    case "featureBullets":
      return "Verkaufsargumente";
    default:
      return "—";
  }
}

export function ProductAiTextAssistant({
  aiReady,
  categoryNames,
  defaultSku,
  onApply,
}: Props) {
  const formId = useId();
  const [kind, setKind] = useState("short_description");
  const [appliedFlash, setAppliedFlash] = useState(false);
  const [state, action, pending] = useActionState(
    generateProductAiTextAction,
    null as GenerateProductAiTextState,
  );

  useEffect(() => {
    if (!appliedFlash) return;
    const t = window.setTimeout(() => setAppliedFlash(false), 2500);
    return () => window.clearTimeout(t);
  }, [appliedFlash]);

  const selectedHint = KIND_OPTIONS.find((o) => o.value === kind)?.hint;

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
          <h2 className="text-base font-semibold text-[#1f2937]">KI-Textassistent</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Entwurf aus Produktfakten erzeugen, prüfen und gezielt übernehmen — speichert nicht
            automatisch.
          </p>
        </div>
      </div>

      {!aiReady ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          KI ist nicht bereit. Bitte unter{" "}
          <Link
            href="/admin/einstellungen/integrationen"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Einstellungen → Integrationen
          </Link>{" "}
          OpenAI konfigurieren.
        </p>
      ) : null}

      <form
        id={formId}
        action={action}
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          // Eigene Form außerhalb des Produktformulars; Fakten aus dem Sibling-Form.
          const main = document.getElementById("admin-product-edit-form") as HTMLFormElement | null;
          const title = readFormValue(main, "title");
          const setHidden = (name: string, value: string) => {
            let input = e.currentTarget.querySelector<HTMLInputElement>(`input[name="${name}"]`);
            if (!input) {
              input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              e.currentTarget.appendChild(input);
            }
            input.value = value;
          };
          setHidden("title", title);
          setHidden("sku", defaultSku?.trim() || readFormValue(main, "productNumber"));
          setHidden("shortDescription", readFormValue(main, "leadText"));
          setHidden("longDescription", readFormValue(main, "descriptionHtml"));
          setHidden("materials", readFormValue(main, "materialText"));
          setHidden("dimensions", readFormValue(main, "dimensionsText"));
          setHidden("categoryNames", categoryNames.join(", "));
        }}
      >
        <div>
          <label htmlFor="ai-text-kind" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Textart
          </label>
          <select
            id="ai-text-kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={!aiReady || pending}
            className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {selectedHint ? <p className="mt-1 text-xs text-[#6b7280]">{selectedHint}</p> : null}
        </div>

        <div>
          <label
            htmlFor="ai-text-instruction"
            className="mb-1 block text-xs font-medium text-[#6b7280]"
          >
            Zusatzhinweis (optional, keine personenbezogenen Daten)
          </label>
          <input
            id="ai-text-instruction"
            name="instruction"
            type="text"
            maxLength={300}
            disabled={!aiReady || pending}
            placeholder="z. B. betont handgemacht, keine medizinischen Claims"
            className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={!aiReady || pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Erzeuge Entwurf…" : "Entwurf erzeugen"}
        </button>
      </form>

      <div aria-live="polite" className="mt-4 space-y-2">
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {appliedFlash ? (
          <p className="text-sm font-medium text-primary" role="status">
            Entwurf in das Formular übernommen — bitte speichern, um zu persistieren.
          </p>
        ) : null}
      </div>

      {state?.ok && state.draftText ? (
        <div className="mt-5 space-y-3 rounded-lg border border-[#e8eaed] bg-[#f7f8fa] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-[#374151]">Vorschau (Entwurf)</p>
            {state.model ? (
              <p className="text-[11px] text-[#6b7280]">Modell: {state.model}</p>
            ) : null}
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-[#1f2937]">
            {state.draftText}
          </pre>
          {state.targetField && state.applyValue != null ? (
            <button
              type="button"
              onClick={() => {
                onApply(state.targetField as ProductAiApplyTarget, state.applyValue!);
                setAppliedFlash(true);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              In „{fieldLabel(state.targetField)}“ übernehmen
            </button>
          ) : (
            <p className="text-xs text-[#6b7280]">
              Diese Textart hat kein Produktfeld zur Übernahme — Text bei Bedarf manuell kopieren.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
