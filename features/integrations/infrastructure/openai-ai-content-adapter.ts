import type { AiContentPort } from "@/features/integrations/application/ai-content-port";
import {
  assertSafeAiProductFacts,
  AiForbiddenPromptFactsError,
  type AiCapability,
  type AiGenerationMeta,
  type AiImageEditInput,
  type AiImageEditResult,
  type AiImageGenerateInput,
  type AiImageGenerateResult,
  type AiModerateInput,
  type AiModerateResult,
  type AiOperationFailure,
  type AiProductFacts,
  type AiTextGenerateInput,
  type AiTextGenerateResult,
  type AiTextKind,
  type AiVisionDescribeInput,
  type AiVisionDescribeResult,
} from "@/features/integrations/domain/ai-content-assistance";
import { buildAiImageEditPrompt } from "@/features/integrations/domain/ai-image-edit-prompt";
import type { OpenAiContentConfig } from "@/features/integrations/infrastructure/openai-config";

type FetchLike = typeof fetch;

const CAPABILITIES: readonly AiCapability[] = [
  "text",
  "vision",
  "image_generation",
  "image_edit",
  "moderation",
];

function failure(
  error: AiOperationFailure["error"],
  message: string,
): AiOperationFailure {
  return { ok: false, error, message };
}

function factsToPromptBlock(facts: AiProductFacts): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(facts)) {
    if (value == null) continue;
    if (typeof value === "string") {
      lines.push(`- ${key}: ${value}`);
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`- ${key}: ${value.join(", ")}`);
      continue;
    }
    lines.push(`- ${key}: ${JSON.stringify(value)}`);
  }
  return lines.length > 0 ? lines.join("\n") : "(keine zusätzlichen Fakten)";
}

function textKindInstruction(kind: AiTextKind, locale: string): string {
  switch (kind) {
    case "short_description":
      return `Schreibe eine kurze Produktbeschreibung (max. 2 Sätze) auf ${locale}.`;
    case "long_description":
      return `Schreibe eine längere, faktentreue Produktbeschreibung auf ${locale}. Keine erfundenen Claims.`;
    case "seo_title":
      return `Schreibe einen SEO-Titel (max. ~60 Zeichen) auf ${locale}.`;
    case "seo_description":
      return `Schreibe eine Meta-Description (max. ~155 Zeichen) auf ${locale}.`;
    case "bullets":
      return `Schreibe 4–6 kurze USP-Bulletpoints auf ${locale}, eine Zeile pro Punkt, mit führendem „- “.`;
    case "alt_text":
      return `Schreibe einen kurzen, barrierefreien Alt-Text auf ${locale}.`;
  }
}

function buildMeta(
  config: OpenAiContentConfig,
  capability: AiCapability,
  model: string,
  requestId: string | null,
  usage: AiGenerationMeta["usage"],
): AiGenerationMeta {
  return {
    provider: "openai",
    model,
    capability,
    requestId,
    usage,
  };
}

function parseUsage(raw: unknown): AiGenerationMeta["usage"] {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const input =
    typeof u.prompt_tokens === "number"
      ? u.prompt_tokens
      : typeof u.input_tokens === "number"
        ? u.input_tokens
        : null;
  const output =
    typeof u.completion_tokens === "number"
      ? u.completion_tokens
      : typeof u.output_tokens === "number"
        ? u.output_tokens
        : null;
  const total = typeof u.total_tokens === "number" ? u.total_tokens : null;
  if (input == null && output == null && total == null) return null;
  return { inputTokens: input, outputTokens: output, totalTokens: total };
}

async function openaiJson(
  config: OpenAiContentConfig,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
): Promise<
  | { ok: true; status: number; json: unknown; requestId: string | null }
  | { ok: false; failure: AiOperationFailure }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetchImpl(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const requestId = res.headers.get("x-request-id");
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (res.status === 429) {
      return {
        ok: false,
        failure: failure("rate_limited", "OpenAI Rate-Limit erreicht. Bitte später erneut versuchen."),
      };
    }
    if (!res.ok) {
      const msg =
        json &&
        typeof json === "object" &&
        "error" in json &&
        json.error &&
        typeof json.error === "object" &&
        "message" in json.error &&
        typeof (json.error as { message: unknown }).message === "string"
          ? (json.error as { message: string }).message
          : `OpenAI-Fehler (HTTP ${res.status}).`;
      return {
        ok: false,
        failure: failure(
          res.status >= 400 && res.status < 500 ? "invalid_request" : "provider_rejected",
          msg,
        ),
      };
    }

    return { ok: true, status: res.status, json, requestId };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        ok: false,
        failure: failure("timeout", "OpenAI-Anfrage ist wegen Timeout abgebrochen."),
      };
    }
    return {
      ok: false,
      failure: failure(
        "provider_rejected",
        e instanceof Error ? e.message : "OpenAI-Anfrage fehlgeschlagen.",
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function openaiMultipart(
  config: OpenAiContentConfig,
  path: string,
  form: FormData,
  fetchImpl: FetchLike,
): Promise<
  | { ok: true; status: number; json: unknown; requestId: string | null }
  | { ok: false; failure: AiOperationFailure }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetchImpl(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: form,
      signal: controller.signal,
    });
    const requestId = res.headers.get("x-request-id");
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (res.status === 429) {
      return {
        ok: false,
        failure: failure("rate_limited", "OpenAI Rate-Limit erreicht. Bitte später erneut versuchen."),
      };
    }
    if (!res.ok) {
      const msg =
        json &&
        typeof json === "object" &&
        "error" in json &&
        json.error &&
        typeof json.error === "object" &&
        "message" in json.error &&
        typeof (json.error as { message: unknown }).message === "string"
          ? (json.error as { message: string }).message
          : `OpenAI-Fehler (HTTP ${res.status}).`;
      return {
        ok: false,
        failure: failure(
          res.status >= 400 && res.status < 500 ? "invalid_request" : "provider_rejected",
          msg,
        ),
      };
    }

    return { ok: true, status: res.status, json, requestId };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        ok: false,
        failure: failure("timeout", "OpenAI-Anfrage ist wegen Timeout abgebrochen."),
      };
    }
    return {
      ok: false,
      failure: failure(
        "provider_rejected",
        e instanceof Error ? e.message : "OpenAI-Anfrage fehlgeschlagen.",
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

function safeFactsOrFailure(
  facts: AiProductFacts | undefined,
): { ok: true; facts: AiProductFacts } | AiOperationFailure {
  if (!facts) return { ok: true, facts: {} };
  try {
    assertSafeAiProductFacts(facts as Record<string, unknown>);
    return { ok: true, facts };
  } catch (e) {
    if (e instanceof AiForbiddenPromptFactsError) {
      return failure("invalid_request", e.message);
    }
    throw e;
  }
}

function chatTextFromJson(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

export function createOpenAiContentAdapter(options: {
  config: OpenAiContentConfig;
  fetchImpl?: FetchLike;
}): AiContentPort {
  const { config, fetchImpl = fetch } = options;

  return {
    providerId() {
      return "openai";
    },
    isConfigured() {
      return true;
    },
    supports(capability: AiCapability) {
      return CAPABILITIES.includes(capability);
    },

    async generateText(input: AiTextGenerateInput): Promise<AiTextGenerateResult> {
      const factsResult = safeFactsOrFailure(input.facts);
      if (!factsResult.ok) return factsResult;

      const locale = input.locale?.trim() || "Deutsch";
      const instruction = [
        textKindInstruction(input.kind, locale),
        "Nutze nur die gelieferten Fakten. Erfinde keine Preise, Zertifikate oder medizinischen Aussagen.",
        input.instruction?.trim() ? `Zusatz: ${input.instruction.trim()}` : null,
        "Produktfakten:",
        factsToPromptBlock(factsResult.facts),
      ]
        .filter(Boolean)
        .join("\n");

      const res = await openaiJson(
        config,
        "/chat/completions",
        {
          model: config.textModel,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "Du bist ein sorgfältiger E-Commerce-Texter. Antworte nur mit dem gewünschten Textentwurf, ohne Einleitung.",
            },
            { role: "user", content: instruction },
          ],
        },
        fetchImpl,
      );
      if (!res.ok) return res.failure;

      const draftText = chatTextFromJson(res.json);
      if (!draftText) {
        return failure("provider_rejected", "OpenAI lieferte keinen Text.");
      }

      return {
        ok: true,
        draftText,
        meta: buildMeta(
          config,
          "text",
          config.textModel,
          res.requestId,
          parseUsage((res.json as { usage?: unknown }).usage),
        ),
      };
    },

    async describeImage(input: AiVisionDescribeInput): Promise<AiVisionDescribeResult> {
      if (!input.imageUrl?.trim()) {
        return failure("invalid_request", "Bild-URL für Alt-Text fehlt.");
      }
      const factsResult = safeFactsOrFailure(input.facts);
      if (!factsResult.ok) return factsResult;

      const locale = input.locale?.trim() || "Deutsch";
      const res = await openaiJson(
        config,
        "/chat/completions",
        {
          model: config.visionModel,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Du schreibst kurze, barrierefreie Alt-Texte für Produktbilder. Nur der Alt-Text, keine Anführungszeichen.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: [
                    `Beschreibe das Bild als Alt-Text auf ${locale}.`,
                    "Produktkontext:",
                    factsToPromptBlock(factsResult.facts),
                  ].join("\n"),
                },
                { type: "image_url", image_url: { url: input.imageUrl.trim() } },
              ],
            },
          ],
        },
        fetchImpl,
      );
      if (!res.ok) return res.failure;

      const draftAltText = chatTextFromJson(res.json);
      if (!draftAltText) {
        return failure("provider_rejected", "OpenAI lieferte keinen Alt-Text.");
      }

      return {
        ok: true,
        draftAltText,
        meta: buildMeta(
          config,
          "vision",
          config.visionModel,
          res.requestId,
          parseUsage((res.json as { usage?: unknown }).usage),
        ),
      };
    },

    async generateImage(input: AiImageGenerateInput): Promise<AiImageGenerateResult> {
      const prompt = input.prompt?.trim();
      if (!prompt) {
        return failure("invalid_request", "Bild-Prompt fehlt.");
      }
      const factsResult = safeFactsOrFailure(input.facts);
      if (!factsResult.ok) return factsResult;

      const enrichedPrompt = [
        prompt,
        Object.keys(factsResult.facts).length > 0
          ? `Kontext: ${factsToPromptBlock(factsResult.facts).replace(/\n/g, " ")}`
          : null,
        "Fotorealistisch, geeignet für Boutique-E-Commerce, keine Logos oder Markenzeichen Dritter, keine Personen mit erkennbaren Gesichtern.",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await openaiJson(
        config,
        "/images/generations",
        {
          model: config.imageModel,
          prompt: enrichedPrompt,
          n: 1,
          size: input.size ?? "1024x1024",
          response_format: "url",
        },
        fetchImpl,
      );
      if (!res.ok) return res.failure;

      const data = (res.json as { data?: Array<{ url?: string; b64_json?: string }> })?.data;
      const first = Array.isArray(data) ? data[0] : undefined;
      const temporaryImageUrl = first?.url?.trim() || null;
      const temporaryImageBase64 = first?.b64_json?.trim() || null;
      if (!temporaryImageUrl && !temporaryImageBase64) {
        return failure("provider_rejected", "OpenAI lieferte kein Bild.");
      }

      return {
        ok: true,
        temporaryImageUrl,
        temporaryImageBase64,
        meta: buildMeta(config, "image_generation", config.imageModel, res.requestId, null),
      };
    },

    async editImage(input: AiImageEditInput): Promise<AiImageEditResult> {
      if (!input.source?.bytes?.length) {
        return failure("invalid_request", "Quellbild fehlt.");
      }
      const factsResult = safeFactsOrFailure(input.facts);
      if (!factsResult.ok) return factsResult;

      const built = buildAiImageEditPrompt({
        mode: input.mode,
        prompt: input.prompt,
        facts: factsResult.facts,
      });
      if (!built.ok) {
        return failure("invalid_request", built.message);
      }

      const form = new FormData();
      form.set("model", config.imageEditModel);
      form.set("prompt", built.prompt);
      form.set("n", "1");
      form.set("size", input.size ?? "1024x1024");
      if (built.transparentBackground) {
        form.set("background", "transparent");
      }
      // GPT Image liefert oft b64; dall-e-2 akzeptiert response_format.
      if (config.imageEditModel.startsWith("dall-e")) {
        form.set("response_format", "b64_json");
      }
      const blob = new Blob([new Uint8Array(input.source.bytes)], {
        type: input.source.contentType || "image/png",
      });
      form.set(
        "image",
        blob,
        input.source.filename || "source.png",
      );

      const res = await openaiMultipart(config, "/images/edits", form, fetchImpl);
      if (!res.ok) return res.failure;

      const data = (res.json as { data?: Array<{ url?: string; b64_json?: string }> })?.data;
      const first = Array.isArray(data) ? data[0] : undefined;
      const temporaryImageUrl = first?.url?.trim() || null;
      const temporaryImageBase64 = first?.b64_json?.trim() || null;
      if (!temporaryImageUrl && !temporaryImageBase64) {
        return failure("provider_rejected", "OpenAI lieferte kein bearbeitetes Bild.");
      }

      return {
        ok: true,
        temporaryImageUrl,
        temporaryImageBase64,
        meta: buildMeta(config, "image_edit", config.imageEditModel, res.requestId, null),
      };
    },

    async moderate(input: AiModerateInput): Promise<AiModerateResult> {
      const text = input.text?.trim() || null;
      const imageUrl = input.imageUrl?.trim() || null;
      if (!text && !imageUrl) {
        return failure("invalid_request", "Moderation benötigt Text und/oder Bild-URL.");
      }

      const moderationInput: Array<string | { type: string; image_url: { url: string } }> = [];
      if (text) moderationInput.push(text);
      if (imageUrl) {
        moderationInput.push({ type: "image_url", image_url: { url: imageUrl } });
      }

      const res = await openaiJson(
        config,
        "/moderations",
        {
          model: config.moderationModel,
          input: moderationInput.length === 1 && typeof moderationInput[0] === "string"
            ? moderationInput[0]
            : moderationInput,
        },
        fetchImpl,
      );
      if (!res.ok) return res.failure;

      const results = (res.json as { results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }> })
        ?.results;
      const first = Array.isArray(results) ? results[0] : undefined;
      const flagged = Boolean(first?.flagged);
      const categories = first?.categories
        ? Object.entries(first.categories)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : [];

      return {
        ok: true,
        flagged,
        categories,
        meta: buildMeta(config, "moderation", config.moderationModel, res.requestId, null),
      };
    },
  };
}
