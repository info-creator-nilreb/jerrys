"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  generateCmsPageSeoAiTextAction,
  type GenerateCmsPageSeoAiTextState,
} from "@/app/admin/(dashboard)/inhalte/ai-cms-page-seo-actions";
import type { CmsPageSeoAiTargetField } from "@/features/integrations";

type Props = {
  aiReady: boolean;
  pageTitle: string;
  pageType: string;
  existingSeoTitle: string;
  existingSeoDescription: string;
  /** Kurzkontext aus Blöcken (Headline/Text), ohne HTML. */
  pageContext: string;
  onApply: (target: CmsPageSeoAiTargetField, value: string) => void;
};

const KIND_OPTIONS = [
  {
    value: "seo_title",
    label: "SEO-Titel",
    hint: "Übernahme in das Feld SEO-Titel (~60 Zeichen)",
  },
  {
    value: "seo_description",
    label: "SEO-Description",
    hint: "Übernahme in die Meta-Description (~155 Zeichen)",
  },
] as const;

function fieldLabel(target: CmsPageSeoAiTargetField): string {
  return target === "seoTitle" ? "SEO-Titel" : "SEO-Description";
}

export function CmsPageSeoAiTextAssistant({
  aiReady,
  pageTitle,
  pageType,
  existingSeoTitle,
  existingSeoDescription,
  pageContext,
  onApply,
}: Props) {
  const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]["value"]>("seo_title");
  const [instruction, setInstruction] = useState("");
  const [appliedFlash, setAppliedFlash] = useState(false);
  const [state, dispatch, pending] = useActionState(
    generateCmsPageSeoAiTextAction,
    null as GenerateCmsPageSeoAiTextState,
  );

  useEffect(() => {
    if (!appliedFlash) return;
    const t = window.setTimeout(() => setAppliedFlash(false), 2500);
    return () => window.clearTimeout(t);
  }, [appliedFlash]);

  const selectedHint = KIND_OPTIONS.find((o) => o.value === kind)?.hint;

  function generateDraft() {
    if (!aiReady || pending || !pageTitle.trim()) return;
    const fd = new FormData();
    fd.set("cmsSeoAiKind", kind);
    fd.set("cmsSeoAiPageTitle", pageTitle);
    fd.set("cmsSeoAiPageType", pageType);
    fd.set("cmsSeoAiExistingTitle", existingSeoTitle);
    fd.set("cmsSeoAiExistingDescription", existingSeoDescription);
    fd.set("cmsSeoAiPageContext", pageContext);
    fd.set("cmsSeoAiInstruction", instruction);
    startTransition(() => {
      dispatch(fd);
    });
  }

  return (
    <div className="rounded-lg border border-[#e8eaed] bg-[#f7f8fa] p-4 sm:col-span-2">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1f2937]">KI für SEO</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">
            Entwurf aus Seitentitel und Inhalt — erst nach Übernahme im Formular, Speichern
            separat.
          </p>
        </div>
      </div>

      {!aiReady ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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

      <div className="mt-3 space-y-3">
        <label className="block text-xs font-medium text-[#6b7280]">
          Textart
          <select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as (typeof KIND_OPTIONS)[number]["value"])
            }
            disabled={!aiReady || pending}
            className="mt-1 h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {selectedHint ? <span className="mt-1 block text-[11px]">{selectedHint}</span> : null}
        </label>

        <label className="block text-xs font-medium text-[#6b7280]">
          Zusatzhinweis (optional)
          <input
            type="text"
            maxLength={300}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={!aiReady || pending}
            placeholder="z. B. Fokus auf Katzenmöbel, ohne Rabatte"
            className="mt-1 h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          />
        </label>

        <button
          type="button"
          onClick={generateDraft}
          disabled={!aiReady || pending || !pageTitle.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Erzeuge Entwurf…" : "Entwurf erzeugen"}
        </button>
      </div>

      <div aria-live="polite" className="mt-3 space-y-2">
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {appliedFlash ? (
          <p className="text-sm font-medium text-primary" role="status">
            Entwurf übernommen — bitte Seite speichern, um zu persistieren.
          </p>
        ) : null}
      </div>

      {state?.ok && state.draftText && state.targetField && state.applyValue != null ? (
        <div className="mt-3 space-y-3 rounded-md border border-[#e8eaed] bg-white p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-[#374151]">Vorschau (Entwurf)</p>
            {state.model ? (
              <p className="text-[11px] text-[#6b7280]">Modell: {state.model}</p>
            ) : null}
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-sm text-[#1f2937]">
            {state.draftText}
          </pre>
          <p className="text-[11px] text-[#6b7280]">
            Übernahme: {state.applyValue.length} Zeichen
            {state.targetField === "seoTitle" ? " (max. 70)" : " (max. 320)"}
          </p>
          <button
            type="button"
            onClick={() => {
              onApply(state.targetField!, state.applyValue!);
              setAppliedFlash(true);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            In „{fieldLabel(state.targetField)}“ übernehmen
          </button>
        </div>
      ) : null}
    </div>
  );
}
