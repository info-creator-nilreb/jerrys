"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PdpResolvedSpec } from "@/lib/catalog/pdp-resolve-display";
import { PdpSpecIcon } from "@/lib/catalog/pdp-spec-icons";

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
      <span className="inline-flex items-center gap-1.5">
        <FlagDe />
        {spec.value}
      </span>
    );
  }
  return <>{spec.value}</>;
}

function SpecAccordionItem({
  spec,
  expanded,
  onToggle,
}: {
  spec: PdpResolvedSpec;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `pdp-spec-panel-${spec.key}`;
  const buttonId = `pdp-spec-button-${spec.key}`;

  return (
    <div className="border-b border-(--surface-muted)/70 last:border-b-0">
      <button
        type="button"
        id={buttonId}
        className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <PdpSpecIcon name={spec.icon} />
        <span className="min-w-0 flex-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--foreground-heading)">
          {spec.label}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-(--foreground-muted) transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
          strokeWidth={1.75}
        />
      </button>
      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="pb-3 pl-8 pr-1 text-sm leading-snug text-(--foreground-muted)"
        >
          <SpecValue spec={spec} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Produktdetails als Accordion mit Lucide-Icons pro Merkmal (Material, Größe, …).
 */
export function ProductPdpSpecsPanel({
  visibleSpecs,
  extraSpecs,
}: {
  visibleSpecs: PdpResolvedSpec[];
  extraSpecs: PdpResolvedSpec[];
}) {
  const allSpecs = [...visibleSpecs, ...extraSpecs];
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  if (allSpecs.length === 0) return null;

  const toggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
      <div className="mt-1">
        {allSpecs.map((spec) => (
          <SpecAccordionItem
            key={spec.key}
            spec={spec}
            expanded={expandedKeys.has(spec.key)}
            onToggle={() => toggle(spec.key)}
          />
        ))}
      </div>
    </section>
  );
}
