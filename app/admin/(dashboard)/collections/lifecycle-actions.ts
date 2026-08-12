"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  deleteCollections,
  setCollectionsActive,
  type CatalogGroupLifecycleResult,
} from "@/features/catalog";
import { getPrisma } from "@/lib/db/prisma";

async function requireAdmin(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

function revalidateCollectionSurfaces(slug?: string) {
  revalidatePath("/admin/collections");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/kollektionen");
  revalidatePath("/kategorien");
  revalidatePath("/");
  if (slug) revalidatePath(`/kollektionen/${slug}`);
}

export type CollectionLifecycleActionState = {
  ok?: boolean;
  message?: string;
  skipped?: { id: string; reason: string }[];
} | null;

function toState(result: CatalogGroupLifecycleResult): CollectionLifecycleActionState {
  return {
    ok: result.ok,
    message: result.message,
    skipped: result.skipped.length > 0 ? result.skipped : undefined,
  };
}

export async function setCollectionActiveAction(
  collectionId: string,
  isActive: boolean,
): Promise<CollectionLifecycleActionState> {
  await requireAdmin();
  const result = await setCollectionsActive([collectionId], isActive);
  if (result.affectedIds.length > 0) revalidateCollectionSurfaces();
  return toState(result);
}

export async function deleteCollectionAction(
  collectionId: string,
): Promise<CollectionLifecycleActionState> {
  await requireAdmin();
  const existing = await getPrisma().collection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  const result = await deleteCollections([collectionId]);
  if (result.affectedIds.length > 0) {
    revalidateCollectionSurfaces(existing?.slug);
    redirect("/admin/collections");
  }
  return toState(result);
}
