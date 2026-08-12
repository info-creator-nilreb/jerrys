/**
 * Provider-neutrale Typen für KI-Content-Entwürfe (ADR-0010 / Epic 13).
 * Ergebnisse sind Entwürfe — Übernahme in Produkt/CMS erst nach expliziter Bestätigung.
 */

export type AiProviderId = "openai";

export type AiCapability =
  | "text"
  | "vision"
  | "image_generation"
  | "image_edit"
  | "moderation";

/** Erlaubte Produkt-/CMS-Fakten für Prompt-Bau (kein DB-Dump). */
export const AI_ALLOWED_PRODUCT_FACT_KEYS = [
  "title",
  "sku",
  "shortDescription",
  "longDescription",
  "attributes",
  "categoryNames",
  "materials",
  "dimensions",
  "targetAudience",
  "tone",
  "language",
  "seoTitle",
  "seoDescription",
  "imageContext",
  /** CMS-Seitenkontext (Slice 5) */
  "pageTitle",
  "pageType",
  "blockType",
  "existingHeadline",
  "existingBody",
  "ctaLabel",
] as const;

export type AiAllowedProductFactKey = (typeof AI_ALLOWED_PRODUCT_FACT_KEYS)[number];

export type AiProductFacts = Partial<
  Record<AiAllowedProductFactKey, string | string[] | Record<string, string>>
>;

const FORBIDDEN_FACT_KEY =
  /email|e-?mail|phone|telefon|address|adresse|customer|kunde|order|bestell|iban|password|passwort|secret|token|credit.?card|kreditkarte|paypal|stripe|auth|session/i;

export class AiForbiddenPromptFactsError extends Error {
  readonly code = "AI_FORBIDDEN_PROMPT_FACTS" as const;
  readonly forbiddenKeys: string[];

  constructor(forbiddenKeys: string[]) {
    super(
      `KI-Prompts dürfen keine personenbezogenen oder geheimen Felder enthalten: ${forbiddenKeys.join(", ")}`,
    );
    this.name = "AiForbiddenPromptFactsError";
    this.forbiddenKeys = forbiddenKeys;
  }
}

/** Wirft, wenn Fakten-Keys nicht auf der Allowlist stehen oder verbotene Muster treffen. */
export function assertSafeAiProductFacts(facts: Record<string, unknown>): asserts facts is AiProductFacts {
  const allowed = new Set<string>(AI_ALLOWED_PRODUCT_FACT_KEYS);
  const forbidden: string[] = [];

  for (const key of Object.keys(facts)) {
    if (!allowed.has(key) || FORBIDDEN_FACT_KEY.test(key)) {
      forbidden.push(key);
    }
  }

  if (forbidden.length > 0) {
    throw new AiForbiddenPromptFactsError(forbidden);
  }
}

export type AiGenerationMeta = {
  provider: AiProviderId;
  model: string;
  capability: AiCapability;
  /** Provider-Request-ID falls vorhanden. */
  requestId: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } | null;
};

export type AiOperationErrorCode =
  | "not_configured"
  | "capability_unsupported"
  | "invalid_request"
  | "rate_limited"
  | "provider_rejected"
  | "timeout"
  | "moderation_blocked";

export type AiOperationFailure = {
  ok: false;
  error: AiOperationErrorCode;
  message: string;
};

export type AiTextKind =
  | "short_description"
  | "long_description"
  | "seo_title"
  | "seo_description"
  | "bullets"
  | "alt_text"
  | "cms_hero_headline"
  | "cms_rich_text";

/** Alias — Allowlist gilt für Produkt und CMS. */
export type AiCmsFacts = AiProductFacts;

/** Wie Produkt-Fakten — gemeinsame Allowlist inkl. CMS-Keys. */
export function assertSafeAiCmsFacts(
  facts: Record<string, unknown>,
): asserts facts is AiCmsFacts {
  assertSafeAiProductFacts(facts);
}

export type AiTextGenerateInput = {
  kind: AiTextKind;
  facts: AiProductFacts;
  /** Optionaler Zusatzhinweis (keine PII). */
  instruction?: string | null;
  locale?: string;
};

export type AiTextGenerateSuccess = {
  ok: true;
  /** Entwurf — nicht gespeichert. */
  draftText: string;
  meta: AiGenerationMeta;
};

export type AiTextGenerateResult = AiTextGenerateSuccess | AiOperationFailure;

export type AiVisionDescribeInput = {
  /** Öffentliche oder temporäre Bild-URL bzw. data-URL. */
  imageUrl: string;
  facts?: AiProductFacts;
  locale?: string;
};

export type AiVisionDescribeSuccess = {
  ok: true;
  draftAltText: string;
  meta: AiGenerationMeta;
};

export type AiVisionDescribeResult = AiVisionDescribeSuccess | AiOperationFailure;

export type AiImageGenerateInput = {
  prompt: string;
  facts?: AiProductFacts;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type AiImageGenerateSuccess = {
  ok: true;
  /** Temporär — nicht in dauerhaften Medienspeicher übernehmen ohne Bestätigung. */
  temporaryImageUrl: string | null;
  /** Falls Provider Base64 liefert. */
  temporaryImageBase64: string | null;
  meta: AiGenerationMeta;
};

export type AiImageGenerateResult = AiImageGenerateSuccess | AiOperationFailure;

/** Bearbeitungsmodus für bestehende Produktbilder (Epic 13). */
export type AiImageEditMode =
  | "cutout"
  | "lifestyle"
  | "studio"
  | "background_replace"
  | "custom";

export type AiImageEditSource = {
  bytes: Buffer;
  contentType: string;
  filename: string;
};

export type AiImageEditInput = {
  mode: AiImageEditMode;
  source: AiImageEditSource;
  /** Zusatzprompt (Pflicht bei background_replace/custom, optional sonst). */
  prompt?: string | null;
  facts?: AiProductFacts;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type AiImageEditSuccess = {
  ok: true;
  temporaryImageUrl: string | null;
  temporaryImageBase64: string | null;
  meta: AiGenerationMeta;
};

export type AiImageEditResult = AiImageEditSuccess | AiOperationFailure;

export type AiModerateInput = {
  text?: string | null;
  imageUrl?: string | null;
};

export type AiModerateSuccess = {
  ok: true;
  flagged: boolean;
  categories: string[];
  meta: AiGenerationMeta;
};

export type AiModerateResult = AiModerateSuccess | AiOperationFailure;
