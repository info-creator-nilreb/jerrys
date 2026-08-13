export { appendIntegrationOutbox } from "@/features/integrations/application/append-integration-outbox";
export { publishIntegrationOutboxBatch } from "@/features/integrations/application/publish-integration-outbox-batch";
export {
  getIntegrationOutboxBacklogStats,
  OUTBOX_STALE_PENDING_MS,
  type IntegrationOutboxBacklogStats,
} from "@/features/integrations/application/outbox-backlog-stats";
export {
  beginWebhookInboxProcessing,
  markWebhookInboxFailed,
  markWebhookInboxProcessed,
  type WebhookInboxBeginResult,
} from "@/features/integrations/application/webhook-inbox";
export {
  getObjectStorage,
  setObjectStorageForTests,
} from "@/features/integrations/application/object-storage";
export { createMemoryObjectStorage } from "@/features/integrations/infrastructure/memory-object-storage";
export {
  ObjectStorageNotConfiguredError,
  type ObjectStorage,
  type PublicObjectPutInput,
  type PublicObjectPutResult,
} from "@/features/integrations/domain/object-storage";
export {
  AI_ALLOWED_PRODUCT_FACT_KEYS,
  AiForbiddenPromptFactsError,
  assertSafeAiCmsFacts,
  assertSafeAiProductFacts,
  type AiAllowedProductFactKey,
  type AiCapability,
  type AiCmsFacts,
  type AiGenerationMeta,
  type AiImageEditInput,
  type AiImageEditMode,
  type AiImageEditResult,
  type AiImageGenerateInput,
  type AiImageGenerateResult,
  type AiModerateInput,
  type AiModerateResult,
  type AiOperationErrorCode,
  type AiOperationFailure,
  type AiProductFacts,
  type AiProviderId,
  type AiTextGenerateInput,
  type AiTextGenerateResult,
  type AiTextKind,
  type AiVisionDescribeInput,
  type AiVisionDescribeResult,
} from "@/features/integrations/domain/ai-content-assistance";
export {
  humanizeAiOperationFailure,
  humanizeAiProviderMessage,
  mapOpenAiHttpFailure,
} from "@/features/integrations/domain/ai-provider-errors";
export {
  estimateAiCostMicros,
  formatEstimatedCostUsd,
} from "@/features/integrations/domain/ai-usage-estimate";
export {
  getAiContentUsageSummary,
  listRecentAiContentGenerationEvents,
  recordAiContentGenerationEvent,
  type AiContentAuditEventPublic,
  type AiContentUsageSummary,
} from "@/features/integrations/infrastructure/ai-content-audit";
export {
  createNotConfiguredAiContentAdapter,
  type AiContentPort,
} from "@/features/integrations/application/ai-content-port";
export {
  createAiContentPort,
  createAiContentPortFromConfig,
} from "@/features/integrations/application/create-ai-content-port";
export {
  generateProductAiTextDraft,
  normalizeAiBulletsForProductField,
  plainTextToProductDescriptionHtml,
  productFieldForAiTextKind,
  type GenerateProductAiTextResult,
  type ProductAiTextTargetField,
} from "@/features/integrations/application/generate-product-ai-text";
export {
  cmsAiKindForBlock,
  cmsFieldForAiTextKind,
  generateCmsAiTextDraft,
  type CmsAiTextBlockType,
  type CmsAiTextTargetField,
  type GenerateCmsAiTextResult,
} from "@/features/integrations/application/generate-cms-ai-text";
export {
  generateProductAiAltTextDraft,
  generateProductAiImageDraft,
  editProductAiImageDraft,
  type EditProductAiImageResult,
  type GenerateProductAiAltTextResult,
  type GenerateProductAiImageResult,
} from "@/features/integrations/application/generate-product-ai-image";
export {
  buildAiImageEditPrompt,
} from "@/features/integrations/domain/ai-image-edit-prompt";
export { createOpenAiContentAdapter } from "@/features/integrations/infrastructure/openai-ai-content-adapter";
export {
  resolveOpenAiContentConfigFromEnv,
  type OpenAiContentConfig,
} from "@/features/integrations/infrastructure/openai-config";
export {
  AI_CONTENT_SETTINGS_ID,
  clearAiContentApiKey,
  consumeAiContentRequestQuota,
  getAiContentSettingsPublic,
  getAiContentSettingsSecrets,
  markAiContentSettingsError,
  markAiContentSettingsVerified,
  saveAiContentSettings,
  verifyOpenAiApiKey,
  type AiContentSettingsPublic,
  type AiContentSettingsSecrets,
  type SaveAiContentSettingsInput,
} from "@/features/integrations/infrastructure/ai-content-settings";
export {
  type EmbeddingFailure,
  type EmbeddingMeta,
  type EmbeddingOperationErrorCode,
  type EmbeddingProviderId,
  type EmbeddingUsage,
  type EmbedTextsInput,
  type EmbedTextsResult,
  type EmbedTextsSuccess,
} from "@/features/integrations/domain/embeddings";
export {
  createNotConfiguredEmbeddingAdapter,
  type EmbeddingPort,
} from "@/features/integrations/application/embedding-port";
export {
  createEmbeddingPort,
  createEmbeddingPortFromConfig,
} from "@/features/integrations/application/create-embedding-port";
export {
  createOpenAiEmbeddingAdapter,
  resolveOpenAiEmbeddingConfigFromEnv,
  type OpenAiEmbeddingConfig,
} from "@/features/integrations/infrastructure/openai-embedding-adapter";
