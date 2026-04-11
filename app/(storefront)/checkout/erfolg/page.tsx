import Link from "next/link";
import { notFound } from "next/navigation";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutErfolgPage({
  searchParams,
}: {
  searchParams: Promise<{ nr?: string }>;
}) {
  const { nr } = await searchParams;
  if (!nr?.trim()) notFound();

  const order = await getPrisma().order.findUnique({
    where: { orderNumber: nr.trim() },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center md:py-28">
      <div className="text-left">
        <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Bestellung" }]} />
      </div>
      <p className="mt-6 text-sm font-medium text-primary">Vielen Dank!</p>
      <h1 className="mt-2 text-2xl font-semibold text-(--foreground-heading)">Bestellung eingegangen</h1>
      <p className="mt-4 text-(--foreground-muted)">
        Deine Bestellnummer:{" "}
        <span className="font-mono font-semibold text-(--foreground-heading)">{order.orderNumber}</span>
      </p>
      <p className="mt-2 text-sm text-(--foreground-muted)">
        Gesamtbetrag: {formatPrice(order.totalGrossCents, order.currency)} inkl. MwSt.
      </p>
      <p className="mt-8 text-sm text-(--foreground-muted)">
        Eine Bestellbestätigung geht an die von dir angegebene E-Mail-Adresse (siehe auch Posteingang und Spam-Ordner).
      </p>
      <Link
        href="/produkte"
        className="mt-10 inline-block rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-(--primary-hover)"
      >
        Weiter einkaufen
      </Link>
    </div>
  );
}
