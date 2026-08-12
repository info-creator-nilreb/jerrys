import type {
  EmbeddingProviderId,
  EmbedTextsInput,
  EmbedTextsResult,
} from "@/features/integrations/domain/embeddings";

/**
 * Provider-neutraler Port für Text-Embeddings (Epic 14 / ADR-0010 Folge).
 * Getrennt vom AI-Content-Draft-Port — teilt ggf. Credentials, nicht die Draft-API.
 */
export type EmbeddingPort = {
  providerId(): EmbeddingProviderId | null;
  isConfigured(): boolean;
  /** Default-Modellname (für Content-Hash-/Index-Metadaten). */
  model(): string | null;
  embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult>;
};

const NOT_CONFIGURED_MESSAGE =
  "Kein Embedding-Anbieter konfiguriert (OPENAI_API_KEY). Semantischer Index bleibt inaktiv; lexikalische Suche bleibt verfügbar.";

export function createNotConfiguredEmbeddingAdapter(): EmbeddingPort {
  return {
    providerId() {
      return null;
    },
    isConfigured() {
      return false;
    },
    model() {
      return null;
    },
    async embedTexts() {
      return {
        ok: false,
        error: "not_configured",
        message: NOT_CONFIGURED_MESSAGE,
      };
    },
  };
}
