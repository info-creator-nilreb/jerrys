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
      <div className="mt-6 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-[#78350f]">
        <p>
          <span className="font-semibold">Hinweis für den Betrieb:</span> Der folgende Text ist eine Vorlage bzw.
          Platzhalter und ersetzt keine Rechtsberatung. Bitte durch vollständige, aktuelle und auf euer Unternehmen
          zugeschnittene Inhalte ersetzen bzw. prüfen lassen.
        </p>
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-(--foreground-heading)">{title}</h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed sm:text-[15px]">{children}</div>
    </article>
  );
}
