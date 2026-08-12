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
  setCategoriesActive,
  deleteCategories,
  setCollectionsActive,
  deleteCollections,
  type CatalogGroupLifecycleResult,
} from "@/features/catalog/application/catalog-group-admin-lifecycle";
