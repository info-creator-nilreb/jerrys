import {
  createNotConfiguredAiContentAdapter,
  type AiContentPort,
} from "@/features/integrations/application/ai-content-port";
import type {
  AiCapability,
  AiGenerationMeta,
  AiImageEditResult,
  AiImageGenerateResult,
  AiModerateResult,
  AiTextGenerateResult,
  AiVisionDescribeResult,
} from "@/features/integrations/domain/ai-content-assistance";
import { humanizeAiProviderMessage } from "@/features/integrations/domain/ai-provider-errors";
import { recordAiContentGenerationEvent } from "@/features/integrations/infrastructure/ai-content-audit";
import { createOpenAiContentAdapter } from "@/features/integrations/infrastructure/openai-ai-content-adapter";
import {
  consumeAiContentRequestQuota,
  getAiContentSettingsSecrets,
} from "@/features/integrations/infrastructure/ai-content-settings";
import {
  resolveOpenAiContentConfigFromEnv,
  type OpenAiContentConfig,
} from "@/features/integrations/infrastructure/openai-config";

async function auditResult(input: {
  capability: AiCapability;
  result:
    | { ok: true; meta: AiGenerationMeta }
    | { ok: false; error: string; message: string };
}): Promise<void> {
  if (input.result.ok) {
    await recordAiContentGenerationEvent({
      capability: input.capability,
      status: "success",
      meta: input.result.meta,
    });
    return;
  }
  await recordAiContentGenerationEvent({
    capability: input.capability,
    status: "failure",
    errorCode: input.result.error,
    errorMessage: humanizeAiProviderMessage(input.result.message),
  });
}

function withDailyQuotaAndAudit(port: AiContentPort): AiContentPort {
  async function guardQuota(
    capability: AiCapability,
  ): Promise<
    | { ok: true }
    | { ok: false; error: "rate_limited"; message: string }
  > {
    const q = await consumeAiContentRequestQuota();
    if (!q.ok) {
      const message = humanizeAiProviderMessage(q.message);
      await recordAiContentGenerationEvent({
        capability,
        status: "failure",
        errorCode: "rate_limited",
        errorMessage: message,
        metadata: { reason: "daily_quota" },
      });
      return { ok: false, error: "rate_limited", message };
    }
    return { ok: true };
  }

  return {
    providerId: () => port.providerId(),
    isConfigured: () => port.isConfigured(),
    supports: (c) => port.supports(c),
    async generateText(input): Promise<AiTextGenerateResult> {
      const q = await guardQuota("text");
      if (!q.ok) return q;
      const result = await port.generateText(input);
      await auditResult({ capability: "text", result });
      if (!result.ok) {
        return { ...result, message: humanizeAiProviderMessage(result.message) };
      }
      return result;
    },
    async describeImage(input): Promise<AiVisionDescribeResult> {
      const q = await guardQuota("vision");
      if (!q.ok) return q;
      const result = await port.describeImage(input);
      await auditResult({ capability: "vision", result });
      if (!result.ok) {
        return { ...result, message: humanizeAiProviderMessage(result.message) };
      }
      return result;
    },
    async generateImage(input): Promise<AiImageGenerateResult> {
      const q = await guardQuota("image_generation");
      if (!q.ok) return q;
      const result = await port.generateImage(input);
      await auditResult({ capability: "image_generation", result });
      if (!result.ok) {
        return { ...result, message: humanizeAiProviderMessage(result.message) };
      }
      return result;
    },
    async editImage(input): Promise<AiImageEditResult> {
      const q = await guardQuota("image_edit");
      if (!q.ok) return q;
      const result = await port.editImage(input);
      await auditResult({ capability: "image_edit", result });
      if (!result.ok) {
        return { ...result, message: humanizeAiProviderMessage(result.message) };
      }
      return result;
    },
    async moderate(input): Promise<AiModerateResult> {
      const q = await guardQuota("moderation");
      if (!q.ok) return q;
      const result = await port.moderate(input);
      await auditResult({ capability: "moderation", result });
      if (!result.ok) {
        return { ...result, message: humanizeAiProviderMessage(result.message) };
      }
      return result;
    },
  };
}

/**
 * Wählt den KI-Content-Adapter: DB-Einstellungen + Env (Env-Key hat Vorrang).
 * Ohne Key oder bei enabled=false → NotConfigured.
 * Generierungen zählen gegen das Admin-Tageslimit (UTC) und werden auditiert.
 */
export async function createAiContentPort(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiContentPort> {
  const secrets = await getAiContentSettingsSecrets(env);
  if (!secrets) {
    // Fallback: reine Env-Config ohne DB (z. B. fehlende Migration).
    const envOnly = resolveOpenAiContentConfigFromEnv(env);
    if (!envOnly) return createNotConfiguredAiContentAdapter();
    return withDailyQuotaAndAudit(createOpenAiContentAdapter({ config: envOnly }));
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
    imageEditModel:
      env.OPENAI_IMAGE_EDIT_MODEL?.trim() ||
      (secrets.imageModel.startsWith("gpt-image") ? secrets.imageModel : "gpt-image-1"),
    moderationModel: secrets.moderationModel,
    timeoutMs: secrets.timeoutMs,
  };

  return withDailyQuotaAndAudit(createOpenAiContentAdapter({ config }));
}

/** Sync-Factory nur für Unit-Tests mit expliziter Config (ohne DB/Quota/Audit). */
export function createAiContentPortFromConfig(config: OpenAiContentConfig): AiContentPort {
  return createOpenAiContentAdapter({ config });
}
