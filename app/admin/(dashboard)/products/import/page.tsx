import { redirect } from "next/navigation";

/** Alte URL `/admin/products/import` → stabile Route ohne reserviertes Segment `import`. */
export default function AdminShopifyImportLegacyRedirect() {
  redirect("/admin/products/shopify-import");
}
