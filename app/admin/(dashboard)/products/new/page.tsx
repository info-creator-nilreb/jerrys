import Link from "next/link";
import { CreateProductForm } from "@/app/admin/(dashboard)/products/new/create-product-form";
import { listManufacturersForAdmin } from "@/lib/catalog/queries";

export const metadata = {
  title: "Neues Produkt",
};

export default async function AdminNewProductPage() {
  const manufacturers = await listManufacturersForAdmin();

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm text-[#6b7280]">
        <Link href="/admin/products" className="font-medium text-primary hover:underline">
          ← Zurück zum Katalog
        </Link>
      </p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
        Neues Produkt
      </h1>
      <p className="mt-2 text-sm text-[#6b7280]">
        Slug erscheint in der URL (/produkte/…). Weitere Bilder kannst du nach dem Anlegen unter Bearbeiten hochladen.
      </p>
      <div className="mt-8">
        <CreateProductForm manufacturers={manufacturers} />
      </div>
    </div>
  );
}
