/** Provider-IDs für Embedding-Adapter (Epic 14). */
export type EmbeddingProviderId = "openai";

export type EmbeddingUsage = {
  inputTokens: number | null;
  totalTokens: number | null;
};

export type EmbeddingMeta = {
  provider: EmbeddingProviderId;
  model: string;
  dims: number;
  requestId: string | null;
  usage: EmbeddingUsage | null;
};

export type EmbeddingOperationErrorCode =
  | "not_configured"
  | "rate_limited"
  | "timeout"
  | "provider_rejected"
  | "invalid_input";

export type EmbeddingFailure = {
  ok: false;
  error: EmbeddingOperationErrorCode;
  message: string;
};

export type EmbedTextsInput = {
  /** Öffentliche Katalogtexte — keine Kundendaten. */
  texts: string[];
};

export type EmbedTextsSuccess = {
  ok: true;
  /** Eine Zeile pro Input-Text, gleiche Reihenfolge. */
  vectors: number[][];
  meta: EmbeddingMeta;
};

export type EmbedTextsResult = EmbedTextsSuccess | EmbeddingFailure;
