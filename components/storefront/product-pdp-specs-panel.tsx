import type { ReactNode } from "react";
import { Layers, PawPrint, Ruler, Scale } from "lucide-react";

const specIconClass = "size-[22px] text-primary";

/**
 * Produktdetails wie Mockup: dezenter Farbakzent, Line-Icons, 2-Spalten (Specs | Eigenschaften).
 */
function SpecRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-(--foreground-heading)">{label}</p>
        <p className="mt-1 text-sm leading-snug text-(--foreground-muted)">{value}</p>
      </div>
    </div>
  );
}

export function ProductPdpSpecsPanel({
  dimensionsText,
  weightText,
  materialText,
  featureBullets,
}: {
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
}) {
  const hasLeft =
    Boolean(dimensionsText?.trim()) || Boolean(weightText?.trim()) || Boolean(materialText?.trim());
  const hasBullets = featureBullets.length > 0;
  if (!hasLeft && !hasBullets) return null;

  const twoCols = hasLeft && hasBullets;

  return (
    <section
      className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.07] px-4 py-4 md:px-5 md:py-5"
      aria-labelledby="pdp-specs-heading"
    >
      <h2
        id="pdp-specs-heading"
        className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary"
      >
        Produktdetails
      </h2>
      <div className={`mt-4 grid gap-6 ${twoCols ? "md:grid-cols-2 md:gap-8" : "grid-cols-1"}`}>
        {hasLeft ? (
          <div className="flex min-w-0 flex-col gap-4">
            {dimensionsText?.trim() ? (
              <SpecRow
                icon={<Ruler className={specIconClass} strokeWidth={1.5} aria-hidden />}
                label="Maße"
                value={dimensionsText.trim()}
              />
            ) : null}
            {weightText?.trim() ? (
              <SpecRow
                icon={<Scale className={specIconClass} strokeWidth={1.5} aria-hidden />}
                label="Gewicht"
                value={weightText.trim()}
              />
            ) : null}
            {materialText?.trim() ? (
              <SpecRow
                icon={<Layers className={specIconClass} strokeWidth={1.5} aria-hidden />}
                label="Material"
                value={materialText.trim()}
              />
            ) : null}
          </div>
        ) : null}
        {hasBullets ? (
          <div
            className={`min-w-0 ${twoCols ? "border-t border-primary/15 pt-4 md:border-t-0 md:border-l md:border-primary/15 md:pl-8 md:pt-0" : "border-t-0 pt-0"}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-primary">
                <PawPrint className={specIconClass} strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-(--foreground-heading)">
                  Eigenschaften
                </p>
                <ul className="mt-2.5 space-y-2 text-sm leading-snug text-(--foreground-muted)">
                  {featureBullets.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 40)}`} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
