/**
 * Reine Ranking-/Ähnlichkeitsfunktionen für hybride Storefront-Suche (Epic 14 Slice 3).
 * Keine I/O — Embeddings und DB liegen in der Application-Schicht.
 */

export const HYBRID_LEXICAL_WEIGHT = 0.55;
export const HYBRID_SEMANTIC_WEIGHT = 0.45;
/** Cosine-Mindestwert, damit ein Treffer ohne Lexik-Match aufgenommen wird. */
export const HYBRID_MIN_SEMANTIC_SCORE = 0.28;
/** Mindest-Hybridscore für die Ergebnisliste. */
export const HYBRID_MIN_SCORE = 0.2;

export type HybridSearchableProduct = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
};

export type HybridCandidateScores = {
  productId: string;
  lexicalScore: number;
  semanticScore: number;
  hybridScore: number;
  lexicalHit: boolean;
  semanticHit: boolean;
};

export type HybridRankMode = "hybrid" | "lexical_fallback";

export type HybridFallbackReason =
  | "not_configured"
  | "provider_error"
  | "empty_index"
  | "no_embeddings"
  | "query_embed_failed";

/** Cosine-Ähnlichkeit; 0 bei leeren/ungleich langen Vektoren oder Nullnorm. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA <= 0 || normB <= 0) return 0;
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  if (!Number.isFinite(sim)) return 0;
  // OpenAI-Embeddings sind typischerweise nicht-negativ skaliert; clamp für Stabilität.
  return Math.min(1, Math.max(0, sim));
}

export function parseEmbeddingVector(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: number[] = [];
  for (const v of raw) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out.push(v);
  }
  return out;
}

function normalizeForMatch(value: string): string {
  return value.trim().toLocaleLowerCase("de");
}

/**
 * Lexikalischer Score 0..1 aus Titel/Slug/Subtitle und optionalem Index-Dokumenttext.
 * Nachvollziehbare Stufen für Ranking-Tests.
 */
export function lexicalMatchScore(
  product: HybridSearchableProduct,
  query: string,
  documentText?: string | null,
): number {
  const needle = normalizeForMatch(query);
  if (needle.length < 2) return 0;

  const title = normalizeForMatch(product.title);
  const slug = normalizeForMatch(product.slug);
  const subtitle = normalizeForMatch(product.subtitle ?? "");
  const doc = normalizeForMatch(documentText ?? "");

  if (title === needle) return 1;
  if (title.startsWith(needle)) return 0.92;
  if (title.includes(needle)) return 0.85;
  if (subtitle.includes(needle)) return 0.72;
  if (slug.includes(needle)) return 0.65;

  // Token-Überlappung (Synonym-/Mehrwort-Nähe ohne Embedding)
  const tokens = needle.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 1) {
    const hay = `${title} ${subtitle} ${slug} ${doc}`;
    const hits = tokens.filter((t) => hay.includes(t)).length;
    if (hits === tokens.length) return 0.58;
    if (hits > 0) return 0.35 * (hits / tokens.length);
  }

  if (doc.includes(needle)) return 0.48;
  return 0;
}

export function combineHybridScore(
  lexicalScore: number,
  semanticScore: number,
  weights: { lexical?: number; semantic?: number } = {},
): number {
  const lw = weights.lexical ?? HYBRID_LEXICAL_WEIGHT;
  const sw = weights.semantic ?? HYBRID_SEMANTIC_WEIGHT;
  const sum = lw + sw;
  if (sum <= 0) return 0;
  const score = (lw * lexicalScore + sw * semanticScore) / sum;
  // Leichter Boost, wenn beide Signale greifen
  const both =
    lexicalScore >= 0.48 && semanticScore >= HYBRID_MIN_SEMANTIC_SCORE ? 0.05 : 0;
  return Math.min(1, score + both);
}

export function isHybridHit(
  scores: Pick<HybridCandidateScores, "lexicalScore" | "semanticScore" | "hybridScore">,
  options?: {
    minSemantic?: number;
    minHybrid?: number;
  },
): boolean {
  const minSemantic = options?.minSemantic ?? HYBRID_MIN_SEMANTIC_SCORE;
  const minHybrid = options?.minHybrid ?? HYBRID_MIN_SCORE;
  const lexicalHit = scores.lexicalScore > 0;
  const semanticHit = scores.semanticScore >= minSemantic;
  if (!lexicalHit && !semanticHit) return false;
  return scores.hybridScore >= minHybrid || lexicalHit;
}

/**
 * Rankt Kandidaten hybrid. Ohne Query-Embedding (`queryEmbedding == null`) nur lexikalisch.
 */
export function rankHybridCandidates(input: {
  products: HybridSearchableProduct[];
  query: string;
  /** productId → gespeicherter Embedding-Vektor */
  embeddingsByProductId?: Map<string, number[]>;
  /** productId → Index-Dokumenttext (für reichere Lexik) */
  documentTextByProductId?: Map<string, string>;
  queryEmbedding?: number[] | null;
  minSemantic?: number;
  minHybrid?: number;
}): {
  mode: HybridRankMode;
  ranked: HybridCandidateScores[];
} {
  const {
    products,
    query,
    embeddingsByProductId,
    documentTextByProductId,
    queryEmbedding,
    minSemantic = HYBRID_MIN_SEMANTIC_SCORE,
    minHybrid = HYBRID_MIN_SCORE,
  } = input;

  const useSemantic =
    queryEmbedding != null &&
    queryEmbedding.length > 0 &&
    embeddingsByProductId != null &&
    embeddingsByProductId.size > 0;

  const ranked: HybridCandidateScores[] = [];

  for (const product of products) {
    const documentText = documentTextByProductId?.get(product.id) ?? null;
    const lexicalScore = lexicalMatchScore(product, query, documentText);
    let semanticScore = 0;
    if (useSemantic) {
      const emb = embeddingsByProductId.get(product.id);
      if (emb) {
        semanticScore = cosineSimilarity(queryEmbedding, emb);
      }
    }
    const hybridScore = useSemantic
      ? combineHybridScore(lexicalScore, semanticScore)
      : lexicalScore;

    const candidate: HybridCandidateScores = {
      productId: product.id,
      lexicalScore,
      semanticScore,
      hybridScore,
      lexicalHit: lexicalScore > 0,
      semanticHit: semanticScore >= minSemantic,
    };

    if (
      isHybridHit(candidate, { minSemantic, minHybrid }) ||
      (!useSemantic && candidate.lexicalHit)
    ) {
      ranked.push(candidate);
    }
  }

  ranked.sort((a, b) => {
    if (b.hybridScore !== a.hybridScore) return b.hybridScore - a.hybridScore;
    if (b.lexicalScore !== a.lexicalScore) return b.lexicalScore - a.lexicalScore;
    if (b.semanticScore !== a.semanticScore) return b.semanticScore - a.semanticScore;
    return a.productId.localeCompare(b.productId);
  });

  return {
    mode: useSemantic ? "hybrid" : "lexical_fallback",
    ranked,
  };
}

/** Ordnet Produkte nach gerankter ID-Liste; unbekannte IDs werden verworfen. */
export function orderProductsByRankedIds<T extends { id: string }>(
  products: T[],
  rankedIds: string[],
): T[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: T[] = [];
  for (const id of rankedIds) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out;
}
