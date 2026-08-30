function StorefrontSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-md bg-(--surface-muted) motion-safe:animate-pulse motion-reduce:animate-none ${className ?? ""}`}
    />
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex min-h-full flex-col overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm">
      <StorefrontSkeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <StorefrontSkeleton className="h-5 w-3/4" />
        <StorefrontSkeleton className="mt-2 h-4 w-1/2" />
        <StorefrontSkeleton className="mt-4 h-6 w-20" />
        <StorefrontSkeleton className="mt-6 h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

function CatalogListingBreadcrumbSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden>
      <StorefrontSkeleton className="h-4 w-12" />
      <span className="text-(--foreground-muted)">/</span>
      <StorefrontSkeleton className="h-4 w-28" />
    </div>
  );
}

export function CatalogListingRouteLoading({
  ariaLabel = "Katalog wird geladen",
}: {
  ariaLabel?: string;
}) {
  return (
    <div
      className="mx-auto max-w-6xl px-4 py-24 md:py-28"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <CatalogListingBreadcrumbSkeleton />
      <StorefrontSkeleton className="mt-6 h-9 w-2/3 max-w-md" />
      <StorefrontSkeleton className="mt-3 h-5 w-full max-w-2xl" />
      <StorefrontSkeleton className="mt-2 h-5 w-4/5 max-w-xl" />
      <div className="mt-8 flex flex-wrap gap-3" aria-hidden>
        <StorefrontSkeleton className="h-10 w-32 rounded-lg" />
        <StorefrontSkeleton className="h-10 w-28 rounded-lg" />
        <StorefrontSkeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="mt-10 grid items-stretch gap-10 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function ProductDetailRouteLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 pb-14 pt-20 md:pb-16 md:pt-24"
      aria-busy="true"
      aria-live="polite"
      aria-label="Produktseite wird geladen"
    >
      <CatalogListingBreadcrumbSkeleton />
      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
        <StorefrontSkeleton className="aspect-square w-full rounded-xl" />
        <div className="rounded-xl border border-(--surface-muted) bg-white p-6 shadow-md md:p-7 lg:p-8">
          <StorefrontSkeleton className="h-3 w-24" />
          <StorefrontSkeleton className="mt-3 h-9 w-full max-w-md" />
          <StorefrontSkeleton className="mt-3 h-5 w-3/4 max-w-sm" />
          <StorefrontSkeleton className="mt-6 h-8 w-28" />
          <StorefrontSkeleton className="mt-6 h-24 w-full rounded-lg" />
          <StorefrontSkeleton className="mt-6 h-12 w-full rounded-lg" />
          <div className="mt-8 space-y-3" aria-hidden>
            <StorefrontSkeleton className="h-4 w-full" />
            <StorefrontSkeleton className="h-4 w-11/12" />
            <StorefrontSkeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StorefrontGenericRouteLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 py-24 md:py-28"
      aria-busy="true"
      aria-live="polite"
      aria-label="Seite wird geladen"
    >
      <StorefrontSkeleton className="h-9 w-2/3 max-w-lg" />
      <StorefrontSkeleton className="mt-6 h-5 w-full max-w-2xl" />
      <StorefrontSkeleton className="mt-2 h-5 w-5/6 max-w-xl" />
      <div className="mt-10 space-y-4" aria-hidden>
        <StorefrontSkeleton className="h-32 w-full rounded-xl" />
        <StorefrontSkeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
