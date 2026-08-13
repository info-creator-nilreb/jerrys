import "server-only";

import { createAiContentPort } from "@/features/integrations/application/create-ai-content-port";
import {
  assertSafeAiCmsFacts,
  type AiCmsFacts,
  type AiGenerationMeta,
  type AiTextKind,
} from "@/features/integrations/domain/ai-content-assistance";

export type CmsPageSeoAiKind = Extract<AiTextKind, "seo_title" | "seo_description">;

export type CmsPageSeoAiTargetField = "seoTitle" | "seoDescription";

/** Schema-Limits ContentPage (lib/content/content-page-schemas). */
const SEO_TITLE_MAX = 70;
const SEO_DESCRIPTION_MAX = 320;

export function cmsPageSeoFieldForKind(kind: CmsPageSeoAiKind): CmsPageSeoAiTargetField {
  return kind === "seo_title" ? "seoTitle" : "seoDescription";
}

export function isCmsPageSeoAiKind(value: string): value is CmsPageSeoAiKind {
  return value === "seo_title" || value === "seo_description";
}

function clipForField(kind: CmsPageSeoAiKind, text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const max = kind === "seo_title" ? SEO_TITLE_MAX : SEO_DESCRIPTION_MAX;
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

export type GenerateCmsPageSeoAiTextResult =
  | {
      ok: true;
      kind: CmsPageSeoAiKind;
      draftText: string;
      applyValue: string;
      targetField: CmsPageSeoAiTargetField;
      meta: AiGenerationMeta;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

/**
 * SEO-Titel / Meta-Description für CMS-Seiten — speichert nichts.
 * Übernahme nur nach expliziter Admin-Bestätigung im Editor.
 */
export async function generateCmsPageSeoAiTextDraft(input: {
  kind: CmsPageSeoAiKind;
  facts: AiCmsFacts;
  instruction?: string | null;
}): Promise<GenerateCmsPageSeoAiTextResult> {
  try {
    assertSafeAiCmsFacts(input.facts as Record<string, unknown>);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ungültige Prompt-Fakten.",
      code: "invalid_request",
    };
  }

  const port = await createAiContentPort();
  if (!port.isConfigured() || !port.supports("text")) {
    return {
      ok: false,
      error:
        "KI-Assistent ist nicht konfiguriert. Bitte unter Einstellungen → Integrationen einen OpenAI-Key hinterlegen.",
      code: "not_configured",
    };
  }

  const pageHint =
    input.kind === "seo_title"
      ? "Kontext: SEO-Titel einer CMS-Inhaltsseite (Shop). Keine Anführungszeichen, kein Keyword-Stuffing."
      : "Kontext: Meta-Description einer CMS-Inhaltsseite (Shop). Einladend, faktentreu, ohne Fake-Claims.";

  const result = await port.generateText({
    kind: input.kind,
    facts: input.facts,
    instruction: [pageHint, input.instruction?.trim() || null].filter(Boolean).join(" "),
    locale: "Deutsch",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      code: result.error,
    };
  }

  const applyValue = clipForField(input.kind, result.draftText);

  return {
    ok: true,
    kind: input.kind,
    draftText: result.draftText.trim(),
    applyValue,
    targetField: cmsPageSeoFieldForKind(input.kind),
    meta: result.meta,
  };
}
