import type { AiCapability } from "@/features/integrations/domain/ai-content-assistance";

/**
 * Grobe USD-Schätzungen (Stand Konfiguration v1) — nur Orientierung für Admins,
 * keine Abrechnungswahrheit. Preise können vom OpenAI-Dashboard abweichen.
 */
const TEXT_INPUT_USD_PER_MTOK = 0.15;
const TEXT_OUTPUT_USD_PER_MTOK = 0.6;
/** Fallback, wenn keine Token-Metadaten geliefert werden. */
const TEXT_REQUEST_FALLBACK_USD = 0.002;
const IMAGE_GENERATION_USD = 0.04;
const IMAGE_EDIT_USD = 0.04;
const VISION_FALLBACK_USD = 0.003;
const MODERATION_FALLBACK_USD = 0.0001;

export function estimateAiCostMicros(input: {
  capability: AiCapability | string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}): number {
  const capability = input.capability;
  const inTok = input.inputTokens ?? 0;
  const outTok = input.outputTokens ?? 0;
  const total = input.totalTokens ?? inTok + outTok;

  let usd = 0;
  if (capability === "image_generation") {
    usd = IMAGE_GENERATION_USD;
  } else if (capability === "image_edit") {
    usd = IMAGE_EDIT_USD;
  } else if (capability === "moderation") {
    usd =
      total > 0
        ? (total / 1_000_000) * TEXT_INPUT_USD_PER_MTOK
        : MODERATION_FALLBACK_USD;
  } else if (capability === "vision") {
    usd =
      inTok > 0 || outTok > 0
        ? (inTok / 1_000_000) * TEXT_INPUT_USD_PER_MTOK +
          (outTok / 1_000_000) * TEXT_OUTPUT_USD_PER_MTOK
        : VISION_FALLBACK_USD;
  } else {
    // text
    if (inTok > 0 || outTok > 0) {
      usd =
        (inTok / 1_000_000) * TEXT_INPUT_USD_PER_MTOK +
        (outTok / 1_000_000) * TEXT_OUTPUT_USD_PER_MTOK;
    } else if (total > 0) {
      usd = (total / 1_000_000) * TEXT_INPUT_USD_PER_MTOK;
    } else {
      usd = TEXT_REQUEST_FALLBACK_USD;
    }
  }

  return Math.max(0, Math.round(usd * 1_000_000));
}

export function formatEstimatedCostUsd(micros: number): string {
  const usd = micros / 1_000_000;
  if (usd <= 0) return "≈ $0,00";
  if (usd < 0.01) return `≈ $${usd.toFixed(4)}`;
  return `≈ $${usd.toFixed(2)}`;
}
