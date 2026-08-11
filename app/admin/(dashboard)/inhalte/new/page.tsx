import Link from "next/link";
import { ContentPageForm } from "@/app/admin/(dashboard)/inhalte/content-page-form";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Neue Inhaltsseite",
};

export default async function AdminInhalteNewPage() {
  let previewProducts: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
  }> = [];
  try {
    const products = await listActiveProductsForStorefront();
    previewProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.images[0]?.url ?? null,
    }));
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/admin/inhalte"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Inhalte
        </Link>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
          Neue Seite
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Live-Vorschau rechts aktualisiert sich sofort; Speichern übernimmt dauerhaft.
        </p>
      </div>
      <ContentPageForm previewProducts={previewProducts} />
    </div>
  );
}
