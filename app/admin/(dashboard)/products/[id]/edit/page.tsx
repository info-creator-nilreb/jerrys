import Link from "next/link";
import { notFound } from "next/navigation";
import { EditProductForm } from "@/app/admin/(dashboard)/products/[id]/edit/edit-product-form";
import { getProductByIdForAdmin, listManufacturersForAdmin } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductByIdForAdmin(id);
  return {
    title: product ? `Bearbeiten: ${product.title}` : "Produkt",
  };
}

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, manufacturers] = await Promise.all([
    getProductByIdForAdmin(id),
    listManufacturersForAdmin(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm text-[#6b7280]">
        <Link href="/admin/products" className="font-medium text-primary hover:underline">
          ← Zurück zum Katalog
        </Link>
      </p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
        Produkt bearbeiten
      </h1>
      <p className="mt-1 text-sm text-[#6b7280]">{product.title}</p>
      <div className="mt-8">
        <EditProductForm product={product} manufacturers={manufacturers} />
      </div>
    </div>
  );
}
