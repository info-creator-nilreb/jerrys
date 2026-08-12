import {
  createNotConfiguredAiContentAdapter,
  type AiContentPort,
} from "@/features/integrations/application/ai-content-port";
import type {
  AiImageGenerateResult,
  AiModerateResult,
  AiTextGenerateResult,
  AiVisionDescribeResult,
} from "@/features/integrations/domain/ai-content-assistance";
import { createOpenAiContentAdapter } from "@/features/integrations/infrastructure/openai-ai-content-adapter";
import {
  consumeAiContentRequestQuota,
  getAiContentSettingsSecrets,
} from "@/features/integrations/infrastructure/ai-content-settings";
import {
  resolveOpenAiContentConfigFromEnv,
  type OpenAiContentConfig,
} from "@/features/integrations/infrastructure/openai-config";

function withDailyQuota(port: AiContentPort): AiContentPort {
  async function guardQuota(): Promise<
    | { ok: true }
    | { ok: false; error: "rate_limited"; message: string }
  > {
    const q = await consumeAiContentRequestQuota();
    if (!q.ok) {
      return { ok: false, error: "rate_limited", message: q.message };
    }
    return { ok: true };
  }

  return {
    providerId: () => port.providerId(),
    isConfigured: () => port.isConfigured(),
    supports: (c) => port.supports(c),
    async generateText(input): Promise<AiTextGenerateResult> {
      const q = await guardQuota();
      if (!q.ok) return q;
      return port.generateText(input);
    },
    async describeImage(input): Promise<AiVisionDescribeResult> {
      const q = await guardQuota();
      if (!q.ok) return q;
      return port.describeImage(input);
    },
    async generateImage(input): Promise<AiImageGenerateResult> {
      const q = await guardQuota();
      if (!q.ok) return q;
      return port.generateImage(input);
    },
    async moderate(input): Promise<AiModerateResult> {
      const q = await guardQuota();
      if (!q.ok) return q;
      return port.moderate(input);
    },
  };
}

/**
 * Wählt den KI-Content-Adapter: DB-Einstellungen + Env (Env-Key hat Vorrang).
 * Ohne Key oder bei enabled=false → NotConfigured.
 * Generierungen zählen gegen das Admin-Tageslimit (UTC).
 */
export async function createAiContentPort(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiContentPort> {
  const secrets = await getAiContentSettingsSecrets(env);
  if (!secrets) {
    // Fallback: reine Env-Config ohne DB (z. B. fehlende Migration).
    const envOnly = resolveOpenAiContentConfigFromEnv(env);
    if (!envOnly) return createNotConfiguredAiContentAdapter();
    return withDailyQuota(createOpenAiContentAdapter({ config: envOnly }));
  }

  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const config: OpenAiContentConfig = {
    apiKey: secrets.apiKey,
    baseUrl,
    textModel: secrets.textModel,
    visionModel: secrets.visionModel,
    imageModel: secrets.imageModel,
    moderationModel: secrets.moderationModel,
    timeoutMs: secrets.timeoutMs,
  };

  return withDailyQuota(createOpenAiContentAdapter({ config }));
}

/** Sync-Factory nur für Unit-Tests mit expliziter Config (ohne DB/Quota). */
export function createAiContentPortFromConfig(config: OpenAiContentConfig): AiContentPort {
  return createOpenAiContentAdapter({ config });
}
