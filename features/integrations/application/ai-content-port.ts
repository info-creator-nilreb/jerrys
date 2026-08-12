import type {
  AiCapability,
  AiImageEditInput,
  AiImageEditResult,
  AiImageGenerateInput,
  AiImageGenerateResult,
  AiModerateInput,
  AiModerateResult,
  AiProviderId,
  AiTextGenerateInput,
  AiTextGenerateResult,
  AiVisionDescribeInput,
  AiVisionDescribeResult,
} from "@/features/integrations/domain/ai-content-assistance";

/**
 * Provider-neutraler Port für KI-Content-Entwürfe (Epic 13 / ADR-0010).
 * Keine Persistenz und kein Publish — nur Generierung + Metadaten.
 */
export type AiContentPort = {
  providerId(): AiProviderId | null;
  isConfigured(): boolean;
  supports(capability: AiCapability): boolean;
  generateText(input: AiTextGenerateInput): Promise<AiTextGenerateResult>;
  describeImage(input: AiVisionDescribeInput): Promise<AiVisionDescribeResult>;
  generateImage(input: AiImageGenerateInput): Promise<AiImageGenerateResult>;
  editImage(input: AiImageEditInput): Promise<AiImageEditResult>;
  moderate(input: AiModerateInput): Promise<AiModerateResult>;
};

const NOT_CONFIGURED_MESSAGE =
  "Kein KI-Anbieter konfiguriert (OPENAI_API_KEY). Content-Entwürfe bleiben manuell.";

function notConfiguredFailure(): {
  ok: false;
  error: "not_configured";
  message: string;
} {
  return {
    ok: false,
    error: "not_configured",
    message: NOT_CONFIGURED_MESSAGE,
  };
}

/** Standard bis Credentials + Adapter existieren. */
export function createNotConfiguredAiContentAdapter(): AiContentPort {
  return {
    providerId() {
      return null;
    },
    isConfigured() {
      return false;
    },
    supports() {
      return false;
    },
    async generateText() {
      return notConfiguredFailure();
    },
    async describeImage() {
      return notConfiguredFailure();
    },
    async generateImage() {
      return notConfiguredFailure();
    },
    async editImage() {
      return notConfiguredFailure();
    },
    async moderate() {
      return notConfiguredFailure();
    },
  };
}
