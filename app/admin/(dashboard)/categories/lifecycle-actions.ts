"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  deleteCategories,
  setCategoriesActive,
  type CatalogGroupLifecycleResult,
} from "@/features/catalog/server";
import { getPrisma } from "@/lib/db/prisma";

async function requireAdmin(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

function revalidateCategorySurfaces(slug?: string) {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/kategorien");
  revalidatePath("/");
  if (slug) revalidatePath(`/kategorien/${slug}`);
}

export type CategoryLifecycleActionState = {
  ok?: boolean;
  message?: string;
  skipped?: { id: string; reason: string }[];
} | null;

function toState(result: CatalogGroupLifecycleResult): CategoryLifecycleActionState {
  return {
    ok: result.ok,
    message: result.message,
    skipped: result.skipped.length > 0 ? result.skipped : undefined,
  };
}

export async function setCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<CategoryLifecycleActionState> {
  await requireAdmin();
  const result = await setCategoriesActive([categoryId], isActive);
  if (result.affectedIds.length > 0) revalidateCategorySurfaces();
  return toState(result);
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<CategoryLifecycleActionState> {
  await requireAdmin();
  const existing = await getPrisma().category.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });
  const result = await deleteCategories([categoryId]);
  if (result.affectedIds.length > 0) {
    revalidateCategorySurfaces(existing?.slug);
    redirect("/admin/categories");
  }
  return toState(result);
}
