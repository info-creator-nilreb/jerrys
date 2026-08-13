"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { updateStorefrontCatalogCacheTag } from "@/lib/catalog/storefront-catalog-cache";
import {
  deleteProducts,
  setProductsActive,
  type ProductLifecycleResult,
} from "@/features/catalog/server";

async function requireAdmin(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

function revalidateCatalog() {
  updateStorefrontCatalogCacheTag();
  revalidatePath("/admin/products");
  revalidatePath("/admin/bestand");
  revalidatePath("/produkte");
  revalidatePath("/kategorien");
  revalidatePath("/kollektionen");
}

export type ProductBulkActionState = {
  ok?: boolean;
  message?: string;
  skipped?: { id: string; reason: string }[];
} | null;

function toState(result: ProductLifecycleResult): ProductBulkActionState {
  return {
    ok: result.ok,
    message: result.message,
    skipped: result.skipped.length > 0 ? result.skipped : undefined,
  };
}

export async function bulkSetProductsActiveAction(
  productIds: string[],
  isActive: boolean,
): Promise<ProductBulkActionState> {
  await requireAdmin();
  const result = await setProductsActive(productIds, isActive);
  if (result.affectedIds.length > 0) revalidateCatalog();
  return toState(result);
}

export async function bulkDeleteProductsAction(
  productIds: string[],
): Promise<ProductBulkActionState> {
  await requireAdmin();
  const result = await deleteProducts(productIds);
  if (result.affectedIds.length > 0) revalidateCatalog();
  return toState(result);
}

export async function setProductActiveAction(
  productId: string,
  isActive: boolean,
): Promise<ProductBulkActionState> {
  return bulkSetProductsActiveAction([productId], isActive);
}

export async function deleteProductAction(
  productId: string,
): Promise<ProductBulkActionState> {
  await requireAdmin();
  const result = await deleteProducts([productId]);
  if (result.affectedIds.length > 0) {
    revalidateCatalog();
    redirect("/admin/products");
  }
  return toState(result);
}
