import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionForm } from "@/app/admin/(dashboard)/collections/collection-form";
import {
  getCollectionByIdForAdmin,
  listProductsForCollectionPicker,
} from "@/lib/catalog/collection-queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const col = await getCollectionByIdForAdmin(id);
  return { title: col ? `${col.title} bearbeiten` : "Kollektion" };
}

export default async function AdminEditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [collection, products] = await Promise.all([
    getCollectionByIdForAdmin(id),
    listProductsForCollectionPicker(),
  ]);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/collections" className="text-sm font-medium text-primary hover:underline">
            ← Kollektionen
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-[#1f2937] sm:text-2xl">{collection.title}</h1>
        </div>
        {collection.isActive ? (
          <Link
            href={`/kollektionen/${collection.slug}`}
            className="text-sm font-medium text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Storefront ansehen
          </Link>
        ) : null}
      </div>
      <CollectionForm
        products={products}
        submitLabel="Speichern"
        collection={{
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          description: collection.description,
          sortOrder: collection.sortOrder,
          isActive: collection.isActive,
          productIds: collection.products.map((p) => p.productId),
        }}
      />
    </div>
  );
}
