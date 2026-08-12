import {
  createNotConfiguredAiContentAdapter,
  type AiContentPort,
} from "@/features/integrations/application/ai-content-port";
import { createOpenAiContentAdapter } from "@/features/integrations/infrastructure/openai-ai-content-adapter";
import { resolveOpenAiContentConfigFromEnv } from "@/features/integrations/infrastructure/openai-config";

/**
 * Wählt den KI-Content-Adapter anhand Env (Slice 1).
 * Ohne `OPENAI_API_KEY` → NotConfigured (manuelle Texte bleiben möglich).
 */
export function createAiContentPort(
  env: NodeJS.ProcessEnv = process.env,
): AiContentPort {
  const config = resolveOpenAiContentConfigFromEnv(env);
  if (!config) return createNotConfiguredAiContentAdapter();
  return createOpenAiContentAdapter({ config });
}
