/**
 * Client-sichere öffentliche API des Catalog-Moduls (reine Domain-/Helper).
 * Server-only (Prisma, Embeddings, Import): `@/features/catalog/server`.
 */

export { defaultVariantSku } from "@/features/catalog/domain/default-variant-sku";
export { categorySlugSchema } from "@/lib/catalog/category-schemas";
export { parseShopifyProductCsv } from "@/features/catalog/domain/shopify-csv";
export {
  mapShopifyProductToCatalog,
  mapShopifyProductsToCatalog,
  generateVariantSku,
  skuSlugPart,
  type CatalogImportProduct,
  type MapShopifyOptions,
} from "@/features/catalog/domain/shopify-map";
export {
  normalizeProductAttributes,
  attributesToFormText,
  parseAttributesFormText,
  attributesFromFormData,
  slugifyAttributeKey,
  preferredAttributeKeyForLabel,
  splitFeatureBulletsAndAttributes,
  reconcileAttributesAndFeatureBullets,
  type ProductAttribute,
} from "@/features/catalog/domain/product-attributes";
export {
  buildProductSearchDocument,
  resolveSearchAvailability,
  type BuiltProductSearchDocument,
  type ProductSearchDocumentSource,
} from "@/features/catalog/domain/product-search-document";
export {
  HYBRID_LEXICAL_WEIGHT,
  HYBRID_MIN_SCORE,
  HYBRID_MIN_SEMANTIC_SCORE,
  HYBRID_SEMANTIC_WEIGHT,
  combineHybridScore,
  cosineSimilarity,
  isHybridHit,
  lexicalMatchScore,
  orderProductsByRankedIds,
  parseEmbeddingVector,
  rankHybridCandidates,
  type HybridCandidateScores,
  type HybridFallbackReason,
  type HybridRankMode,
  type HybridSearchableProduct,
} from "@/features/catalog/domain/hybrid-product-search";
export {
  PUBLIC_PRODUCT_FEED_VERSION,
  buildPublicProductFeedDocument,
  buildPublicProductFeedItem,
  formatPublicPriceAmount,
  ifNoneMatchMatches,
  publicProductFeedEtag,
  resolvePublicAvailability,
  type PublicProductAvailability,
  type PublicProductFeedDocument,
  type PublicProductFeedItem,
  type PublicProductFeedSource,
} from "@/features/catalog/domain/public-product-feed";
export {
  SEARCH_EVAL_SET_DE,
  SEARCH_EVAL_SET_VERSION,
  type SearchEvalCase,
  type SearchEvalIntent,
} from "@/features/catalog/domain/search-eval-set.de";
export {
  fallbackRate,
  formatIndexAgeLabel,
  indexAgeHours,
  meanLatencyMs,
  nullHitRate,
  type SearchEvalRunResult,
} from "@/features/catalog/domain/search-quality-metrics";
