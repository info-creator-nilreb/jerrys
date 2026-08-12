import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { EditProductForm } from "@/app/admin/(dashboard)/products/[id]/edit/edit-product-form";
import { ProductLifecycleControls } from "@/app/admin/(dashboard)/products/[id]/edit/product-lifecycle-controls";
import { getAiContentSettingsPublic } from "@/features/integrations";
import { adminProductForEditForm } from "@/lib/catalog/admin-product-form";
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
  const [product, manufacturers, aiSettings] = await Promise.all([
    getProductByIdForAdmin(id),
    listManufacturersForAdmin(),
    getAiContentSettingsPublic(),
  ]);
  if (!product) notFound();
  const formProduct = adminProductForEditForm(product);

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6b7280]">
            <Link href="/admin/products" className="font-medium text-primary hover:underline">
              ← Zurück zum Katalog
            </Link>
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Produkt bearbeiten
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">{product.title}</p>
        </div>
        {product.isActive ? (
          <a
            href={`/produkte/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Shop-Vorschau
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : (
          <span className="text-sm text-[#9ca3af]" title="Nach Aktivierung im Shop erreichbar">
            Shop-Vorschau (inaktiv)
          </span>
        )}
      </div>
      {/* pb-28: Platz für den sticky AdminFormActionDock — Lifecycle nicht verdecken */}
      <div className="mt-8 flex flex-col gap-8 pb-28">
        <EditProductForm
          product={formProduct}
          manufacturers={manufacturers}
          aiReady={aiSettings.ready}
        />
        <ProductLifecycleControls
          productId={product.id}
          isActive={product.isActive}
          title={product.title}
        />
      </div>
    </div>
  );
}
