import Link from "next/link";
import { CollectionForm } from "@/app/admin/(dashboard)/collections/collection-form";
import { listProductsForCollectionPicker } from "@/lib/catalog/collection-queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Neue Kollektion",
};

export default async function AdminNewCollectionPage() {
  const products = await listProductsForCollectionPicker();

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <Link href="/admin/collections" className="text-sm font-medium text-primary hover:underline">
          ← Kollektionen
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[#1f2937] sm:text-2xl">Neue Kollektion</h1>
      </div>
      <CollectionForm products={products} submitLabel="Kollektion anlegen" />
    </div>
  );
}
