import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Produkte",
  description: "Design Katzenmöbel von jerry's – made in Germany.",
};

export default async function ProduktePage() {
  const products = await listActiveProductsForStorefront();

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <h1 className="text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
        Produkte
      </h1>
      <p className="mt-2 max-w-2xl text-(--foreground-muted)">
        Hochwertige Katzenmöbel – designed und gefertigt in Deutschland.
      </p>

      {products.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Aktuell sind keine Produkte im Shop sichtbar. Bitte später erneut vorbeischauen.
        </p>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <p className="mt-12 text-center text-sm text-(--foreground-muted)">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}
