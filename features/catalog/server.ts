import "server-only";

export {
  persistAiGeneratedProductImage,
  type PersistAiProductImageResult,
} from "@/features/catalog/application/persist-ai-product-image";
export {
  SEARCH_INDEX_STATE_ID,
  getSearchIndexStatusPublic,
  rebuildProductSearchIndex,
  syncProductSearchDocuments,
  type RebuildProductSearchIndexResult,
  type SearchIndexStatusPublic,
  type SearchRebuildStats,
} from "@/features/catalog/application/sync-product-search-index";
export {
  searchStorefrontProductsHybrid,
  type HybridStorefrontSearchMeta,
  type HybridStorefrontSearchResult,
} from "@/features/catalog/application/hybrid-storefront-search";
export { getPublicProductFeedDocument } from "@/features/catalog/application/public-product-feed";
