"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";

type Props = {
  html: string | null | undefined;
  className?: string;
};

/**
 * Lange Produktbeschreibung: zunächst ~5 Zeilen, Rest per „Mehr anzeigen“.
 */
export function ProductPdpDescription({ html, className = "" }: Props) {
  const panelId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const clean = sanitizeProductDescriptionHtml(html);

  useEffect(() => {
    if (!clean || expanded) return;
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      setNeedsClamp(el.scrollHeight > el.clientHeight + 2);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [clean, expanded]);

  if (!clean) return null;

  const bodyClass =
    "product-description text-sm leading-relaxed text-(--foreground-muted) [&_a]:text-primary [&_a]:underline [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

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
          ref={bodyRef}
          id={panelId}
          className={expanded ? bodyClass : `${bodyClass} line-clamp-5`}
          dangerouslySetInnerHTML={{ __html: clean }}
        />
        {!expanded && needsClamp ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-white to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {needsClamp || expanded ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-(--primary-hover)"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              Weniger anzeigen
              <ChevronUp className="size-4" aria-hidden strokeWidth={2} />
            </>
          ) : (
            <>
              Mehr anzeigen
              <ChevronDown className="size-4" aria-hidden strokeWidth={2} />
            </>
          )}
        </button>
      ) : null}
    </section>
  );
}
