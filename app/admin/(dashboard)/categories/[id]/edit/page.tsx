import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/app/admin/(dashboard)/categories/category-form";
import { CategoryLifecycleControls } from "@/app/admin/(dashboard)/categories/[id]/edit/category-lifecycle-controls";
import {
  getCategoryByIdForAdmin,
  listCollectionsForCategoryPicker,
  listRootCategoriesForParentPicker,
} from "@/lib/catalog/category-queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = await getCategoryByIdForAdmin(id);
  return { title: cat ? `${cat.title} bearbeiten` : "Kategorie" };
}

export default async function AdminEditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [category, collections, parentOptions] = await Promise.all([
    getCategoryByIdForAdmin(id),
    listCollectionsForCategoryPicker(),
    listRootCategoriesForParentPicker(id),
  ]);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <Link href="/admin/categories" className="text-sm font-medium text-primary hover:underline">
          ← Kategorien
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[#1f2937] sm:text-2xl">{category.title}</h1>
        <p className="mt-1 text-xs text-[#9ca3af]">
          Storefront: /kategorien/{category.slug} — Produkte über verknüpfte Kollektionen.
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-8 pb-28">
        <CategoryForm
          collections={collections}
          parentOptions={parentOptions}
          submitLabel="Speichern"
          category={{
            id: category.id,
            title: category.title,
            slug: category.slug,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
            parentId: category.parentId,
            collectionIds: category.collections.map((c) => c.collectionId),
            hasChildren: category._count.children > 0,
          }}
        />
        <CategoryLifecycleControls
          categoryId={category.id}
          isActive={category.isActive}
          title={category.title}
          hasChildren={category._count.children > 0}
        />
      </div>
    </div>
  );
}
