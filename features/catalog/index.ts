export { defaultVariantSku } from "@/features/catalog/domain/default-variant-sku";
export {
  syncDefaultVariantFromProduct,
  type DefaultVariantCommerceFields,
  type ProductVariantMirrorFields,
} from "@/features/catalog/application/sync-default-variant-from-product";
export {
  listActiveCategoriesForNav,
  listActiveCategoryTreeForNav,
  listActiveCategoriesForStorefrontIndex,
  listActiveProductsByCategorySlug,
} from "@/lib/catalog/category-queries";
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
  planShopifyCsvImport,
  importShopifyProductsFromCsv,
  type ShopifyImportOptions,
  type ShopifyImportReport,
  type ShopifyImportProductResult,
} from "@/features/catalog/application/import-shopify-csv";
export {
  setProductsActive,
  deleteProducts,
  type ProductLifecycleResult,
} from "@/features/catalog/application/product-admin-lifecycle";
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
