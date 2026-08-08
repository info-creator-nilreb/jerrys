import Link from "next/link";
import { CategoryForm } from "@/app/admin/(dashboard)/categories/category-form";
import {
  listProductsForCategoryPicker,
  listRootCategoriesForParentPicker,
} from "@/lib/catalog/category-queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Neue Kategorie",
};

export default async function AdminNewCategoryPage() {
  const [products, parentOptions] = await Promise.all([
    listProductsForCategoryPicker(),
    listRootCategoriesForParentPicker(),
  ]);

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <Link href="/admin/categories" className="text-sm font-medium text-primary hover:underline">
          ← Kategorien
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[#1f2937] sm:text-2xl">Neue Kategorie</h1>
      </div>
      <CategoryForm
        products={products}
        parentOptions={parentOptions}
        submitLabel="Kategorie anlegen"
      />
    </div>
  );
}
