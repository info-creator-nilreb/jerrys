import "server-only";

import { createAiContentPort } from "@/features/integrations/application/create-ai-content-port";
import {
  assertSafeAiProductFacts,
  type AiGenerationMeta,
  type AiImageEditMode,
  type AiProductFacts,
} from "@/features/integrations/domain/ai-content-assistance";

export type GenerateProductAiImageResult =
  | {
      ok: true;
      temporaryImageUrl: string | null;
      temporaryImageBase64: string | null;
      /** data-URL oder https-URL für Vorschau/Moderation. */
      previewSrc: string;
      moderation: {
        flagged: boolean;
        categories: string[];
      };
      meta: AiGenerationMeta;
      moderationMeta: AiGenerationMeta | null;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

function previewSrcFromResult(input: {
  temporaryImageUrl: string | null;
  temporaryImageBase64: string | null;
}): string | null {
  if (input.temporaryImageUrl?.trim()) return input.temporaryImageUrl.trim();
  if (input.temporaryImageBase64?.trim()) {
    return `data:image/png;base64,${input.temporaryImageBase64.trim()}`;
  }
  return null;
}

/**
 * Erzeugt ein temporäres Produktbild und moderiert es.
 * Persistenz erst nach expliziter Admin-Bestätigung (separater Use Case).
 */
export async function generateProductAiImageDraft(input: {
  prompt: string;
  facts?: AiProductFacts;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
}): Promise<GenerateProductAiImageResult> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return { ok: false, error: "Bild-Prompt fehlt.", code: "invalid_request" };
  }
  if (prompt.length > 2000) {
    return { ok: false, error: "Prompt ist zu lang (max. 2000 Zeichen).", code: "invalid_request" };
  }

  if (input.facts) {
    try {
      assertSafeAiProductFacts(input.facts as Record<string, unknown>);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Ungültige Prompt-Fakten.",
        code: "invalid_request",
      };
    }
  }

  const port = await createAiContentPort();
  if (!port.isConfigured() || !port.supports("image_generation")) {
    return {
      ok: false,
      error:
        "KI-Bildgenerierung ist nicht konfiguriert. Bitte unter Einstellungen → Integrationen OpenAI einrichten.",
      code: "not_configured",
    };
  }

  const generated = await port.generateImage({
    prompt,
    facts: input.facts,
    size: input.size ?? "1024x1024",
  });

  if (!generated.ok) {
    return { ok: false, error: generated.message, code: generated.error };
  }

  const previewSrc = previewSrcFromResult(generated);
  if (!previewSrc) {
    return { ok: false, error: "OpenAI lieferte kein Bild.", code: "provider_rejected" };
  }

  let moderation = { flagged: false, categories: [] as string[] };
  let moderationMeta: AiGenerationMeta | null = null;

  if (port.supports("moderation")) {
    const mod = await port.moderate({ imageUrl: previewSrc });
    if (mod.ok) {
      moderation = { flagged: mod.flagged, categories: mod.categories };
      moderationMeta = mod.meta;
      if (mod.flagged) {
        return {
          ok: false,
          error: `Bild wurde von der Moderation blockiert (${mod.categories.join(", ") || "policy"}). Bitte Prompt anpassen.`,
          code: "moderation_blocked",
        };
      }
    }
    // Moderation-Fehler blockieren die Vorschau nicht hart — Confirm prüft erneut.
  }

  return {
    ok: true,
    temporaryImageUrl: generated.temporaryImageUrl,
    temporaryImageBase64: generated.temporaryImageBase64,
    previewSrc,
    moderation,
    meta: generated.meta,
    moderationMeta,
  };
}

export type GenerateProductAiAltTextResult =
  | {
      ok: true;
      draftAltText: string;
      meta: AiGenerationMeta;
    }
  | { ok: false; error: string; code?: string };

export async function generateProductAiAltTextDraft(input: {
  imageUrl: string;
  facts?: AiProductFacts;
}): Promise<GenerateProductAiAltTextResult> {
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    return { ok: false, error: "Bild-URL fehlt.", code: "invalid_request" };
  }

  if (input.facts) {
    try {
      assertSafeAiProductFacts(input.facts as Record<string, unknown>);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Ungültige Prompt-Fakten.",
        code: "invalid_request",
      };
    }
  }

  const port = await createAiContentPort();
  if (!port.isConfigured() || !port.supports("vision")) {
    return {
      ok: false,
      error: "KI-Vision ist nicht konfiguriert.",
      code: "not_configured",
    };
  }

  const result = await port.describeImage({
    imageUrl,
    facts: input.facts,
    locale: "Deutsch",
  });

  if (!result.ok) {
    return { ok: false, error: result.message, code: result.error };
  }

  return { ok: true, draftAltText: result.draftAltText, meta: result.meta };
}

export type EditProductAiImageResult = GenerateProductAiImageResult;

/**
 * Bearbeitet ein bestehendes Produktbild (Freistellen, Lifestyle, …) inkl. Moderation.
 */
export async function editProductAiImageDraft(input: {
  mode: AiImageEditMode;
  sourceBytes: Buffer;
  sourceContentType: string;
  sourceFilename: string;
  prompt?: string | null;
  facts?: AiProductFacts;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
}): Promise<EditProductAiImageResult> {
  if (!input.sourceBytes?.length) {
    return { ok: false, error: "Quellbild fehlt.", code: "invalid_request" };
  }

  if (input.facts) {
    try {
      assertSafeAiProductFacts(input.facts as Record<string, unknown>);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Ungültige Prompt-Fakten.",
        code: "invalid_request",
      };
    }
  }

  const port = await createAiContentPort();
  if (!port.isConfigured() || !port.supports("image_edit")) {
    return {
      ok: false,
      error:
        "KI-Bildbearbeitung ist nicht konfiguriert. Bitte unter Einstellungen → Integrationen OpenAI einrichten (Images Edit / gpt-image).",
      code: "not_configured",
    };
  }

  const edited = await port.editImage({
    mode: input.mode,
    source: {
      bytes: input.sourceBytes,
      contentType: input.sourceContentType,
      filename: input.sourceFilename,
    },
    prompt: input.prompt,
    facts: input.facts,
    size: input.size ?? "1024x1024",
  });

  if (!edited.ok) {
    return { ok: false, error: edited.message, code: edited.error };
  }

  const previewSrc = previewSrcFromResult(edited);
  if (!previewSrc) {
    return { ok: false, error: "OpenAI lieferte kein bearbeitetes Bild.", code: "provider_rejected" };
  }

  let moderation = { flagged: false, categories: [] as string[] };
  let moderationMeta: AiGenerationMeta | null = null;

  if (port.supports("moderation")) {
    const mod = await port.moderate({ imageUrl: previewSrc });
    if (mod.ok) {
      moderation = { flagged: mod.flagged, categories: mod.categories };
      moderationMeta = mod.meta;
      if (mod.flagged) {
        return {
          ok: false,
          error: `Bearbeitetes Bild wurde von der Moderation blockiert (${mod.categories.join(", ") || "policy"}).`,
          code: "moderation_blocked",
        };
      }
    }
  }

  return {
    ok: true,
    temporaryImageUrl: edited.temporaryImageUrl,
    temporaryImageBase64: edited.temporaryImageBase64,
    previewSrc,
    moderation,
    meta: edited.meta,
    moderationMeta,
  };
}
