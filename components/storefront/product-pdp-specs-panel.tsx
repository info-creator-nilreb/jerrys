"use client";

import { useState } from "react";
import type { PdpResolvedSpec } from "@/lib/catalog/pdp-resolve-display";

function FlagDe() {
  return (
    <span
      className="inline-flex h-2.5 w-3.5 shrink-0 flex-col overflow-hidden rounded-sm border border-(--surface-muted)"
      aria-hidden
    >
      <span className="h-1/3 w-full bg-black" />
      <span className="h-1/3 w-full bg-[#DD0000]" />
      <span className="h-1/3 w-full bg-[#FFCE00]" />
    </span>
  );
}

function SpecValue({ spec }: { spec: PdpResolvedSpec }) {
  if (spec.label === "Herkunft" && /\bdeutschland|germany\b/i.test(spec.value)) {
    return (
      <span className="inline-flex items-center justify-end gap-1.5">
        <FlagDe />
        {spec.value}
      </span>
    );
  }
  return <>{spec.value}</>;
}

function SpecTable({ specs }: { specs: PdpResolvedSpec[] }) {
  return (
    <dl className="divide-y divide-(--surface-muted)/70">
      {specs.map((spec) => (
        <div key={spec.key} className="flex justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
          <dt className="shrink-0 text-(--foreground-muted)">{spec.label}</dt>
          <dd className="min-w-0 text-right leading-snug text-(--foreground-heading)">
            <SpecValue spec={spec} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Kuratierte Produktdetails — flache Label/Wert-Liste ohne Icon-Wand.
 */
export function ProductPdpSpecsPanel({
  visibleSpecs,
  extraSpecs,
}: {
  visibleSpecs: PdpResolvedSpec[];
  extraSpecs: PdpResolvedSpec[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (visibleSpecs.length === 0 && extraSpecs.length === 0) return null;

  return (
    <section
      className="mt-5 border-t border-(--surface-muted) pt-5"
      aria-labelledby="pdp-specs-heading"
    >
      <h2
        id="pdp-specs-heading"
        className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary"
      >
        Produktdetails
      </h2>
      <div className="mt-3">
        <SpecTable specs={visibleSpecs} />
        {extraSpecs.length > 0 && expanded ? (
          <div className="mt-1 border-t border-(--surface-muted)/70 pt-1">
            <SpecTable specs={extraSpecs} />
          </div>
        ) : null}
      </div>
      {extraSpecs.length > 0 ? (
        <button
          type="button"
          className="mt-2 text-sm font-medium text-primary hover:text-(--primary-hover)"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Weniger Details" : "+ Alle Details anzeigen"}
        </button>
      ) : null}
    </section>
  );
}
