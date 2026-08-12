import type { EmbeddingPort } from "@/features/integrations/application/embedding-port";
import type {
  EmbeddingFailure,
  EmbeddingMeta,
  EmbedTextsResult,
} from "@/features/integrations/domain/embeddings";

export type OpenAiEmbeddingConfig = {
  apiKey: string;
  baseUrl: string;
  /** z. B. text-embedding-3-small */
  embeddingModel: string;
  timeoutMs: number;
};

type FetchLike = typeof fetch;

function failure(
  error: EmbeddingFailure["error"],
  message: string,
): EmbeddingFailure {
  return { ok: false, error, message };
}

function mapHttpFailure(status: number, json: unknown): EmbeddingFailure {
  const msg =
    json &&
    typeof json === "object" &&
    "error" in json &&
    json.error &&
    typeof json.error === "object" &&
    "message" in json.error &&
    typeof (json.error as { message?: unknown }).message === "string"
      ? (json.error as { message: string }).message
      : null;

  if (status === 401 || status === 403) {
    return failure(
      "provider_rejected",
      "Embedding-API: Authentifizierung fehlgeschlagen. API-Key unter Integrationen prüfen.",
    );
  }
  if (status === 429) {
    return failure(
      "rate_limited",
      "Embedding-API: Rate-Limit erreicht. Später erneut indexieren.",
    );
  }
  if (status >= 500) {
    return failure(
      "provider_rejected",
      msg
        ? `Embedding-API vorübergehend nicht erreichbar: ${msg}`
        : "Embedding-API vorübergehend nicht erreichbar.",
    );
  }
  return failure(
    "provider_rejected",
    msg ? `Embedding-API abgelehnt: ${msg}` : `Embedding-API Fehler (HTTP ${status}).`,
  );
}

/**
 * OpenAI Embeddings über HTTP (`/v1/embeddings`).
 * Kein SDK — analog zum AI-Content-Adapter.
 */
export function createOpenAiEmbeddingAdapter(options: {
  config: OpenAiEmbeddingConfig;
  fetchImpl?: FetchLike;
}): EmbeddingPort {
  const { config, fetchImpl = fetch } = options;

  return {
    providerId() {
      return "openai";
    },
    isConfigured() {
      return true;
    },
    model() {
      return config.embeddingModel;
    },
    async embedTexts(input): Promise<EmbedTextsResult> {
      const texts = input.texts.map((t) => t.trim()).filter(Boolean);
      if (texts.length === 0) {
        return failure("invalid_input", "Keine Texte für Embeddings übergeben.");
      }
      if (texts.length > 64) {
        return failure(
          "invalid_input",
          "Zu viele Texte in einem Embedding-Batch (max. 64).",
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const res = await fetchImpl(`${config.baseUrl}/embeddings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.embeddingModel,
            input: texts,
          }),
          signal: controller.signal,
        });
        const requestId = res.headers.get("x-request-id");
        let json: unknown = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }
        if (!res.ok) {
          return mapHttpFailure(res.status, json);
        }

        const data = json as {
          data?: Array<{ embedding?: unknown; index?: number }>;
          usage?: { prompt_tokens?: number; total_tokens?: number };
        };
        const rows = Array.isArray(data.data) ? [...data.data] : [];
        rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const vectors: number[][] = [];
        for (const row of rows) {
          if (!Array.isArray(row.embedding)) {
            return failure(
              "provider_rejected",
              "Embedding-API: ungültiges Vektorformat.",
            );
          }
          const vec = row.embedding.map((n) => Number(n));
          if (vec.some((n) => !Number.isFinite(n))) {
            return failure(
              "provider_rejected",
              "Embedding-API: Vektor enthält ungültige Werte.",
            );
          }
          vectors.push(vec);
        }
        if (vectors.length !== texts.length) {
          return failure(
            "provider_rejected",
            "Embedding-API: Anzahl der Vektoren stimmt nicht mit der Eingabe überein.",
          );
        }

        const dims = vectors[0]?.length ?? 0;
        if (dims <= 0) {
          return failure("provider_rejected", "Embedding-API: leerer Vektor.");
        }

        const meta: EmbeddingMeta = {
          provider: "openai",
          model: config.embeddingModel,
          dims,
          requestId,
          usage: data.usage
            ? {
                inputTokens:
                  typeof data.usage.prompt_tokens === "number"
                    ? data.usage.prompt_tokens
                    : null,
                totalTokens:
                  typeof data.usage.total_tokens === "number"
                    ? data.usage.total_tokens
                    : null,
              }
            : null,
        };

        return { ok: true, vectors, meta };
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return failure(
            "timeout",
            "Embedding-Anfrage wegen Timeout abgebrochen.",
          );
        }
        return failure(
          "provider_rejected",
          e instanceof Error ? e.message : "Embedding-Anfrage fehlgeschlagen.",
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function resolveOpenAiEmbeddingConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiEmbeddingConfig | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const timeoutRaw = env.OPENAI_TIMEOUT_MS?.trim();
  const timeoutParsed = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : NaN;
  return {
    apiKey,
    baseUrl,
    embeddingModel: env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
    timeoutMs:
      Number.isFinite(timeoutParsed) && timeoutParsed > 0 ? timeoutParsed : 30_000,
  };
}
