import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/app/admin/(dashboard)/categories/category-form";
import {
  getCategoryByIdForAdmin,
  listProductsForCategoryPicker,
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
  const [category, products, parentOptions] = await Promise.all([
    getCategoryByIdForAdmin(id),
    listProductsForCategoryPicker(),
    listRootCategoriesForParentPicker(id),
  ]);
  if (!category) notFound();

  const primaryRow = category.products.find((p) => p.isPrimary);

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <Link href="/admin/categories" className="text-sm font-medium text-primary hover:underline">
          ← Kategorien
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[#1f2937] sm:text-2xl">{category.title}</h1>
        <p className="mt-1 text-xs text-[#9ca3af]">
          Storefront-Listing folgt in Epic 10 Slice 3 (/kategorien/{category.slug}).
        </p>
      </div>
      <CategoryForm
        products={products}
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
          productIds: category.products.map((p) => p.productId),
          primaryProductId: primaryRow?.productId ?? null,
          hasChildren: category._count.children > 0,
        }}
      />
    </div>
  );
}
