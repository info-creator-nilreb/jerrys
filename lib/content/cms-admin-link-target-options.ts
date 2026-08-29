import { listProductsForCollectionPicker } from "@/lib/catalog/collection-queries";
import { listCategoriesForAdmin } from "@/lib/catalog/category-queries";
import {
  buildCmsLinkTargetOptions,
  type CmsLinkTargetOption,
} from "@/lib/content/cms-link-target-options";
import { listCollectionsForCmsAdmin } from "@/lib/content/cms-admin-catalog-options";
import { listContentPages } from "@/lib/content/content-pages";

/** Seiten, Kollektionen, Kategorien und Produkte für CMS-Link-Picker. */
export async function listCmsLinkTargetOptionsForAdmin(): Promise<CmsLinkTargetOption[]> {
  const [pages, collections, categories, products] = await Promise.all([
    listContentPages(),
    listCollectionsForCmsAdmin(),
    listCategoriesForAdmin(),
    listProductsForCollectionPicker(),
  ]);

  return buildCmsLinkTargetOptions({
    pages: pages.map((p) => ({ slug: p.slug, title: p.title, status: p.status })),
    collections: collections.map((c) => ({ slug: c.slug, title: c.title })),
    categories: categories.map((c) => ({ slug: c.slug, title: c.title })),
    products: products.map((p) => ({ slug: p.slug, title: p.title })),
  });
}
