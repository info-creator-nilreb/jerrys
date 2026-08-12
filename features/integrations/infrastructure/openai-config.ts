export type OpenAiContentConfig = {
  apiKey: string;
  baseUrl: string;
  textModel: string;
  visionModel: string;
  imageModel: string;
  /** Modell für /images/edits (Freistellen, Lifestyle, …). */
  imageEditModel: string;
  moderationModel: string;
  /** Request-Timeout in ms. */
  timeoutMs: number;
};

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Liest OpenAI-Konfiguration aus Env.
 * Ohne `OPENAI_API_KEY` → null (NotConfigured).
 */
export function resolveOpenAiContentConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiContentConfig | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );

  return {
    apiKey,
    baseUrl,
    textModel: env.OPENAI_TEXT_MODEL?.trim() || "gpt-4o-mini",
    visionModel: env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini",
    imageModel: env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
    imageEditModel:
      env.OPENAI_IMAGE_EDIT_MODEL?.trim() ||
      (env.OPENAI_IMAGE_MODEL?.trim()?.startsWith("gpt-image")
        ? env.OPENAI_IMAGE_MODEL.trim()
        : "gpt-image-1"),
    moderationModel: env.OPENAI_MODERATION_MODEL?.trim() || "omni-moderation-latest",
    timeoutMs: readPositiveInt(env.OPENAI_TIMEOUT_MS, 30_000),
  };
}
