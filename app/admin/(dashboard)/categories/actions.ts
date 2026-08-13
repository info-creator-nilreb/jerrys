"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { replaceCategoryCollectionMemberships } from "@/lib/catalog/category-membership";
import { categoryUpsertSchema } from "@/lib/catalog/category-schemas";
import { updateStorefrontCatalogCacheTag } from "@/lib/catalog/storefront-catalog-cache";
import { getPrisma } from "@/lib/db/prisma";

export type CategoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

function revalidateCategoryPaths(slug: string) {
  updateStorefrontCatalogCacheTag();
  revalidatePath("/admin/categories");
  revalidatePath(`/kategorien/${slug}`);
  revalidatePath("/kategorien");
}

async function validateParentId(
  parentId: string | null,
  categoryId: string | undefined,
  hasChildren: boolean,
): Promise<string | null> {
  if (!parentId) return null;
  if (categoryId && parentId === categoryId) {
    return "Eine Kategorie kann nicht ihre eigene übergeordnete Kategorie sein.";
  }
  if (hasChildren) {
    return "Kategorien mit Unterkategorien müssen auf oberster Ebene bleiben.";
  }
  const parent = await getPrisma().category.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });
  if (!parent) {
    return "Übergeordnete Kategorie nicht gefunden.";
  }
  if (parent.parentId != null) {
    return "Es ist nur eine Verschachtelungsebene erlaubt (Unterkategorie einer Hauptkategorie).";
  }
  return null;
}

export async function saveCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const parsed = categoryUpsertSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? undefined,
    parentId: formData.get("parentId"),
    collectionIds: formData.getAll("collectionIds"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const isActive = d.isActive ?? false;

  let hasChildren = false;
  if (d.id) {
    const childCount = await getPrisma().category.count({ where: { parentId: d.id } });
    hasChildren = childCount > 0;
  }

  const parentError = await validateParentId(d.parentId, d.id, hasChildren);
  if (parentError) {
    return { fieldErrors: { parentId: parentError } };
  }

  const existingCollections = await getPrisma().collection.findMany({
    where: { id: { in: d.collectionIds } },
    select: { id: true },
  });
  const validCollectionIds = new Set(existingCollections.map((c) => c.id));
  const collectionIds = d.collectionIds.filter((id) => validCollectionIds.has(id));

  try {
    if (d.id) {
      const prev = await getPrisma().category.findUnique({
        where: { id: d.id },
        select: { slug: true },
      });
      if (!prev) {
        return { error: "Kategorie nicht gefunden." };
      }

      await getPrisma().$transaction(async (tx) => {
        await tx.category.update({
          where: { id: d.id },
          data: {
            title: d.title.trim(),
            slug: d.slug,
            description: d.description ?? null,
            sortOrder: d.sortOrder,
            isActive,
            parentId: d.parentId,
          },
        });
        await replaceCategoryCollectionMemberships(tx, d.id!, collectionIds);
      });

      revalidateCategoryPaths(d.slug);
      if (prev.slug !== d.slug) {
        revalidatePath(`/kategorien/${prev.slug}`);
      }
      revalidatePath("/admin/collections");
      return { ok: true };
    }

    const created = await getPrisma().$transaction(async (tx) => {
      const cat = await tx.category.create({
        data: {
          title: d.title.trim(),
          slug: d.slug,
          description: d.description ?? null,
          sortOrder: d.sortOrder,
          isActive,
          parentId: d.parentId,
        },
      });
      await replaceCategoryCollectionMemberships(tx, cat.id, collectionIds);
      return cat;
    });

    revalidateCategoryPaths(created.slug);
    revalidatePath("/admin/collections");
    redirect(`/admin/categories/${created.id}/edit`);
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { fieldErrors: { slug: "Dieser Slug ist bereits vergeben." } };
    }
    throw e;
  }
}
