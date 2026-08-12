import type {
  AiImageEditMode,
  AiProductFacts,
} from "@/features/integrations/domain/ai-content-assistance";

function factsHint(facts?: AiProductFacts): string {
  if (!facts) return "";
  const parts: string[] = [];
  if (typeof facts.title === "string" && facts.title.trim()) {
    parts.push(`Product: ${facts.title.trim()}`);
  }
  if (typeof facts.materials === "string" && facts.materials.trim()) {
    parts.push(`Material: ${facts.materials.trim()}`);
  }
  return parts.length ? ` ${parts.join(". ")}.` : "";
}

/**
 * Baut den Edit-Prompt für OpenAI Images Edits.
 * Freistellen/Lifestyle/Studio nutzen feste Vorlagen; custom/background_replace brauchen User-Text.
 */
export function buildAiImageEditPrompt(input: {
  mode: AiImageEditMode;
  prompt?: string | null;
  facts?: AiProductFacts;
}): { ok: true; prompt: string; transparentBackground: boolean } | { ok: false; message: string } {
  const extra = input.prompt?.trim() || "";
  const hint = factsHint(input.facts);

  switch (input.mode) {
    case "cutout":
      return {
        ok: true,
        transparentBackground: true,
        prompt: [
          "Remove the background completely and keep the exact same product unchanged (shape, color, labels, proportions).",
          "Clean e-commerce cutout / freigestelltes Produktfoto, sharp edges, no shadows on background if transparent, no extra objects.",
          extra ? `Additional notes: ${extra}` : null,
          hint.trim() || null,
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "studio":
      return {
        ok: true,
        transparentBackground: false,
        prompt: [
          "Keep the exact same product unchanged. Place it on a clean seamless white/light studio background with soft natural product shadows.",
          "Boutique catalog photography, photorealistic, no people, no logos of other brands.",
          extra ? `Additional notes: ${extra}` : null,
          hint.trim() || null,
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "lifestyle":
      return {
        ok: true,
        transparentBackground: false,
        prompt: [
          "Keep the exact same product as the hero subject. Place it in a warm boutique lifestyle scene with soft daylight.",
          extra
            ? `Scene direction: ${extra}`
            : "Tasteful interior or tabletop setting that fits a small artisan shop.",
          "Photorealistic, no recognizable faces, no third-party brand logos.",
          hint.trim() || null,
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "background_replace":
      if (!extra) {
        return {
          ok: false,
          message: "Für Hintergrund ersetzen bitte den gewünschten neuen Hintergrund beschreiben.",
        };
      }
      return {
        ok: true,
        transparentBackground: false,
        prompt: [
          "Keep the exact same product unchanged. Replace only the background.",
          `New background: ${extra}`,
          "Photorealistic, natural lighting matching the product, no people with recognizable faces.",
          hint.trim() || null,
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "custom":
      if (!extra) {
        return {
          ok: false,
          message: "Für freie Bearbeitung bitte einen Prompt angeben.",
        };
      }
      return {
        ok: true,
        transparentBackground: false,
        prompt: [
          "Edit the provided product image. Preserve the product identity unless the prompt explicitly changes it.",
          extra,
          "Photorealistic boutique e-commerce quality, no third-party logos.",
          hint.trim() || null,
        ]
          .filter(Boolean)
          .join(" "),
      };
  }
}
