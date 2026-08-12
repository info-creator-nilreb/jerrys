import "server-only";

import { createAiContentPort } from "@/features/integrations/application/create-ai-content-port";
import {
  assertSafeAiProductFacts,
  type AiGenerationMeta,
  type AiProductFacts,
  type AiTextKind,
} from "@/features/integrations/domain/ai-content-assistance";

export type ProductAiTextTargetField =
  | "leadText"
  | "descriptionHtml"
  | "featureBullets";

/** Welche Formularfelder eine Übernahme unterstützen (SEO vorerst nur Vorschau/Copy). */
export function productFieldForAiTextKind(
  kind: AiTextKind,
): ProductAiTextTargetField | null {
  switch (kind) {
    case "short_description":
      return "leadText";
    case "long_description":
      return "descriptionHtml";
    case "bullets":
      return "featureBullets";
    case "cms_hero_headline":
    case "cms_rich_text":
    default:
      return null;
  }
}

/** Plaintext → einfache Absätze für den Rich-Text-Editor. */
export function plainTextToProductDescriptionHtml(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (t.startsWith("<")) return t;
  const esc = t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n/g, "\n");
  const paragraphs = esc
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`);
  return paragraphs.join("") || `<p>${esc}</p>`;
}

/** Bullet-Zeilen ohne führende Spiegelstriche für featureBullets. */
export function normalizeAiBulletsForProductField(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s+/, "").trim())
    .filter(Boolean)
    .join("\n");
}

export type GenerateProductAiTextResult =
  | {
      ok: true;
      kind: AiTextKind;
      draftText: string;
      /** Fertig für Formularübernahme (HTML bzw. Bullet-Zeilen). */
      applyValue: string;
      targetField: ProductAiTextTargetField | null;
      meta: AiGenerationMeta;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

export async function generateProductAiTextDraft(input: {
  kind: AiTextKind;
  facts: AiProductFacts;
  instruction?: string | null;
}): Promise<GenerateProductAiTextResult> {
  try {
    assertSafeAiProductFacts(input.facts as Record<string, unknown>);
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

  const result = await port.generateText({
    kind: input.kind,
    facts: input.facts,
    instruction: input.instruction,
    locale: "Deutsch",
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      code: result.error,
    };
  }

  const targetField = productFieldForAiTextKind(input.kind);
  let applyValue = result.draftText;
  if (targetField === "descriptionHtml") {
    applyValue = plainTextToProductDescriptionHtml(result.draftText);
  } else if (targetField === "featureBullets") {
    applyValue = normalizeAiBulletsForProductField(result.draftText);
  }

  return {
    ok: true,
    kind: input.kind,
    draftText: result.draftText,
    applyValue,
    targetField,
    meta: result.meta,
  };
}
