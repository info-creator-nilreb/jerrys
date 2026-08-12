import {
  createNotConfiguredEmbeddingAdapter,
  type EmbeddingPort,
} from "@/features/integrations/application/embedding-port";
import { getAiContentSettingsSecrets } from "@/features/integrations/infrastructure/ai-content-settings";
import {
  createOpenAiEmbeddingAdapter,
  resolveOpenAiEmbeddingConfigFromEnv,
  type OpenAiEmbeddingConfig,
} from "@/features/integrations/infrastructure/openai-embedding-adapter";

/**
 * Wählt den Embedding-Adapter: teilt OpenAI-Credentials mit KI-Content (Env hat Vorrang),
 * ist aber ein eigener Port (kein Draft-Content). Ohne Key → NotConfigured.
 */
export async function createEmbeddingPort(
  env: NodeJS.ProcessEnv = process.env,
): Promise<EmbeddingPort> {
  const embeddingModel =
    env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

  const secrets = await getAiContentSettingsSecrets(env);
  if (!secrets) {
    const envOnly = resolveOpenAiEmbeddingConfigFromEnv(env);
    if (!envOnly) return createNotConfiguredEmbeddingAdapter();
    return createOpenAiEmbeddingAdapter({ config: envOnly });
  }

  if (!secrets.enabled) {
    return createNotConfiguredEmbeddingAdapter();
  }

  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const config: OpenAiEmbeddingConfig = {
    apiKey: secrets.apiKey,
    baseUrl,
    embeddingModel,
    timeoutMs: secrets.timeoutMs,
  };
  return createOpenAiEmbeddingAdapter({ config });
}

/** Sync-Factory für Unit-Tests mit expliziter Config. */
export function createEmbeddingPortFromConfig(
  config: OpenAiEmbeddingConfig,
): EmbeddingPort {
  return createOpenAiEmbeddingAdapter({ config });
}
