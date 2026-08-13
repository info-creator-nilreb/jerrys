import { ProductPdpDescriptionToggle } from "@/components/storefront/product-pdp-description-toggle";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";

type Props = {
  html: string | null | undefined;
  className?: string;
};

/**
 * Lange Produktbeschreibung: HTML serverseitig sanitizen + rendern,
 * Aufklappen clientseitig (~5 Zeilen).
 */
export function ProductPdpDescription({ html, className = "" }: Props) {
  const clean = sanitizeProductDescriptionHtml(html);
  if (!clean) return null;

  const panelId = "pdp-product-description";
  const bodyClass =
    "product-description line-clamp-5 text-sm leading-relaxed text-(--foreground-muted) [&_a]:text-primary [&_a]:underline [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

  return (
    <section
      className={`mt-5 border-t border-(--surface-muted) pt-5 ${className}`}
      aria-labelledby={`${panelId}-heading`}
    >
      <h2
        id={`${panelId}-heading`}
        className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary"
      >
        Beschreibung
      </h2>
      <div className="relative mt-3">
        <div
          id={panelId}
          className={bodyClass}
          dangerouslySetInnerHTML={{ __html: clean }}
        />
        <div
          id={`${panelId}-fade`}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-white to-transparent"
          aria-hidden
        />
      </div>
      <ProductPdpDescriptionToggle panelId={panelId} />
    </section>
  );
}
