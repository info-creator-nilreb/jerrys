import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";

export function LegalDocumentShell({
  title,
  children,
  breadcrumbLabel,
}: {
  title: string;
  children: React.ReactNode;
  /** Optional kürzerer Text im Brotkrümel als die h1-Überschrift */
  breadcrumbLabel?: string;
}) {
  const crumbCurrent = breadcrumbLabel ?? title;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 text-(--foreground-muted) md:py-20">
      <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: crumbCurrent }]} />
      <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-(--foreground-heading)">
        {title}
      </h1>
      <div className="mt-8 text-sm leading-relaxed sm:text-[15px]">{children}</div>
    </article>
  );
}
