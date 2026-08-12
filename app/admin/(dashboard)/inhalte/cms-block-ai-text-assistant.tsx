"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  generateCmsAiTextAction,
  type GenerateCmsAiTextState,
} from "@/app/admin/(dashboard)/inhalte/ai-cms-text-actions";

type CmsAiTextBlockType = "hero" | "richText";
type CmsAiTextTargetField = "headline" | "html";

type Props = {
  aiReady: boolean;
  blockType: CmsAiTextBlockType;
  pageTitle: string;
  pageType: string;
  existingHeadline?: string;
  existingBody?: string;
  ctaLabel?: string;
  onApply: (target: CmsAiTextTargetField, value: string) => void;
};

function fieldLabel(target: CmsAiTextTargetField): string {
  return target === "headline" ? "Überschrift" : "Text";
}

export function CmsBlockAiTextAssistant({
  aiReady,
  blockType,
  pageTitle,
  pageType,
  existingHeadline = "",
  existingBody = "",
  ctaLabel = "",
  onApply,
}: Props) {
  const formId = useId();
  const [appliedFlash, setAppliedFlash] = useState(false);
  const [state, action, pending] = useActionState(
    generateCmsAiTextAction,
    null as GenerateCmsAiTextState,
  );

  useEffect(() => {
    if (!appliedFlash) return;
    const t = window.setTimeout(() => setAppliedFlash(false), 2500);
    return () => window.clearTimeout(t);
  }, [appliedFlash]);

  const titleHint =
    blockType === "hero"
      ? "Entwurf für die Hero-Überschrift — erst nach Übernahme im Block, Speichern separat."
      : "Entwurf für den Rich-Text — erst nach Übernahme im Block, Speichern separat.";

  return (
    <div className="rounded-lg border border-[#e8eaed] bg-[#f7f8fa] p-4">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1f2937]">KI-Textentwurf</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">{titleHint}</p>
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

      <form id={formId} action={action} className="mt-3 space-y-3">
        <input type="hidden" name="blockType" value={blockType} />
        <input type="hidden" name="pageTitle" value={pageTitle} />
        <input type="hidden" name="pageType" value={pageType} />
        <input type="hidden" name="existingHeadline" value={existingHeadline} />
        <input type="hidden" name="existingBody" value={existingBody} />
        <input type="hidden" name="ctaLabel" value={ctaLabel} />

        <label className="block text-xs font-medium text-[#6b7280]">
          Zusatzhinweis (optional)
          <input
            name="instruction"
            type="text"
            maxLength={300}
            disabled={!aiReady || pending}
            placeholder="z. B. einladend, ohne Rabattversprechen"
            className="mt-1 h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={!aiReady || pending || !pageTitle.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Erzeuge Entwurf…" : "Entwurf erzeugen"}
        </button>
      </form>

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
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-sm text-[#1f2937]">
            {state.draftText}
          </pre>
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
