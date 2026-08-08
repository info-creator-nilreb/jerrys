"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { collectionUpsertSchema } from "@/lib/catalog/collection-schemas";
import { getPrisma } from "@/lib/db/prisma";

export type CollectionFormState = {
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

function revalidateCollectionPaths(slug: string) {
  revalidatePath("/admin/collections");
  revalidatePath("/kollektionen");
  revalidatePath(`/kollektionen/${slug}`);
  revalidatePath("/produkte");
}

export async function saveCollection(
  _prev: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const parsed = collectionUpsertSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? undefined,
    productIds: formData.getAll("productIds"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const isActive = d.isActive ?? false;

  const existingProducts = await getPrisma().product.findMany({
    where: { id: { in: d.productIds } },
    select: { id: true },
  });
  const validIds = new Set(existingProducts.map((p) => p.id));
  const productIds = d.productIds.filter((id) => validIds.has(id));

  try {
    if (d.id) {
      const prev = await getPrisma().collection.findUnique({
        where: { id: d.id },
        select: { slug: true },
      });
      if (!prev) {
        return { error: "Kollektion nicht gefunden." };
      }

      await getPrisma().$transaction(async (tx) => {
        await tx.collection.update({
          where: { id: d.id },
          data: {
            title: d.title.trim(),
            slug: d.slug,
            description: d.description ?? null,
            sortOrder: d.sortOrder,
            isActive,
          },
        });
        await tx.collectionProduct.deleteMany({ where: { collectionId: d.id! } });
        if (productIds.length > 0) {
          await tx.collectionProduct.createMany({
            data: productIds.map((productId, index) => ({
              collectionId: d.id!,
              productId,
              sortOrder: index,
            })),
          });
        }
      });

      revalidateCollectionPaths(d.slug);
      if (prev.slug !== d.slug) {
        revalidatePath(`/kollektionen/${prev.slug}`);
      }
      return { ok: true };
    }

    const created = await getPrisma().$transaction(async (tx) => {
      const col = await tx.collection.create({
        data: {
          title: d.title.trim(),
          slug: d.slug,
          description: d.description ?? null,
          sortOrder: d.sortOrder,
          isActive,
        },
      });
      if (productIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: productIds.map((productId, index) => ({
            collectionId: col.id,
            productId,
            sortOrder: index,
          })),
        });
      }
      return col;
    });

    revalidateCollectionPaths(created.slug);
    redirect(`/admin/collections/${created.id}/edit`);
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { fieldErrors: { slug: "Dieser Slug ist bereits vergeben." } };
    }
    throw e;
  }
}
