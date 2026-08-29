import Link from "next/link";

/** CTA unter Produkt-Karussell-Blöcken (mobil volle Breite, Desktop etwas größer). */
export function ProductBlockShowAllLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Link
        href={href}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:min-h-12 md:w-auto md:min-w-[14rem] md:px-10 md:py-3.5 md:text-[0.9375rem]"
      >
        {label}
      </Link>
    </div>
  );
}
