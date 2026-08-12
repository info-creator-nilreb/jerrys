import "server-only";

import { createAiContentPort } from "@/features/integrations/application/create-ai-content-port";
import { plainTextToProductDescriptionHtml } from "@/features/integrations/application/generate-product-ai-text";
import {
  assertSafeAiCmsFacts,
  type AiCmsFacts,
  type AiGenerationMeta,
  type AiTextKind,
} from "@/features/integrations/domain/ai-content-assistance";

export type CmsAiTextBlockType = "hero" | "richText";

export type CmsAiTextTargetField = "headline" | "html";

export function cmsAiKindForBlock(blockType: CmsAiTextBlockType): AiTextKind {
  return blockType === "hero" ? "cms_hero_headline" : "cms_rich_text";
}

export function cmsFieldForAiTextKind(kind: AiTextKind): CmsAiTextTargetField | null {
  switch (kind) {
    case "cms_hero_headline":
      return "headline";
    case "cms_rich_text":
      return "html";
    default:
      return null;
  }
}

export type GenerateCmsAiTextResult =
  | {
      ok: true;
      kind: AiTextKind;
      draftText: string;
      applyValue: string;
      targetField: CmsAiTextTargetField;
      meta: AiGenerationMeta;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

/**
 * Textentwurf für ausgewählte CMS-Blöcke — speichert/publiziert nichts.
 * Übernahme nur nach expliziter Admin-Bestätigung im Editor.
 */
export async function generateCmsAiTextDraft(input: {
  blockType: CmsAiTextBlockType;
  facts: AiCmsFacts;
  instruction?: string | null;
}): Promise<GenerateCmsAiTextResult> {
  try {
    assertSafeAiCmsFacts(input.facts as Record<string, unknown>);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ungültige Prompt-Fakten.",
      code: "invalid_request",
    };
  }

  const kind = cmsAiKindForBlock(input.blockType);
  const targetField = cmsFieldForAiTextKind(kind);
  if (!targetField) {
    return {
      ok: false,
      error: "Dieser Block-Typ unterstützt keine KI-Textentwürfe.",
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

  const blockHint =
    input.blockType === "hero"
      ? "Kontext: Hero-Block einer CMS-Seite. Ausgabe nur die Überschrift."
      : "Kontext: Rich-Text-Block einer CMS-Seite. Ausgabe nur Fließtext.";

  const result = await port.generateText({
    kind,
    facts: {
      ...input.facts,
      blockType: input.blockType,
    },
    instruction: [blockHint, input.instruction?.trim() || null].filter(Boolean).join(" "),
    locale: "Deutsch",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      code: result.error,
    };
  }

  const applyValue =
    targetField === "html"
      ? plainTextToProductDescriptionHtml(result.draftText)
      : result.draftText.trim();

  return {
    ok: true,
    kind,
    draftText: result.draftText,
    applyValue,
    targetField,
    meta: result.meta,
  };
}
