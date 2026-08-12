import type { ReactNode } from "react";
import {
  Gem,
  Heart,
  Layers,
  Leaf,
  MapPin,
  Palette,
  PawPrint,
  Ruler,
  Scale,
  Shield,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import type { PdpResolvedDisplay, PdpSpecIcon } from "@/lib/catalog/pdp-resolve-display";

const specIconClass = "size-[22px] text-primary";

function SpecIcon({ name }: { name: PdpSpecIcon }) {
  const props = { className: specIconClass, strokeWidth: 1.5 as const, "aria-hidden": true as const };
  switch (name) {
    case "ruler":
      return <Ruler {...props} />;
    case "scale":
      return <Scale {...props} />;
    case "layers":
      return <Layers {...props} />;
    case "palette":
      return <Palette {...props} />;
    case "map-pin":
      return <MapPin {...props} />;
    case "gem":
      return <Gem {...props} />;
    case "users":
      return <Users {...props} />;
    case "paw":
      return <PawPrint {...props} />;
    case "leaf":
      return <Leaf {...props} />;
    case "heart":
      return <Heart {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "sparkles":
      return <Sparkles {...props} />;
    case "flag-de":
      return <MapPin {...props} />;
    case "tag":
    default:
      return <Tag {...props} />;
  }
}

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
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-(--foreground-heading)">
          {label}
        </p>
        <p className="mt-1 text-sm leading-snug text-(--foreground-muted)">{value}</p>
      </div>
    </div>
  );
}

/**
 * Produktdetails aus Stammdaten: Specs links, Eigenschaften rechts.
 * Icons richten sich nach Merkmal bzw. Produktfamilie (kein festes Pfoten-Icon).
 */
export function ProductPdpSpecsPanel({ display }: { display: PdpResolvedDisplay }) {
  const hasLeft = display.leftSpecs.length > 0;
  const hasBullets = display.propertyLines.length > 0;
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
            {display.leftSpecs.map((spec) => (
              <SpecRow
                key={spec.key}
                icon={<SpecIcon name={spec.icon} />}
                label={spec.label}
                value={spec.value}
              />
            ))}
          </div>
        ) : null}
        {hasBullets ? (
          <div
            className={`min-w-0 ${twoCols ? "border-t border-primary/15 pt-4 md:border-t-0 md:border-l md:border-primary/15 md:pl-8 md:pt-0" : "border-t-0 pt-0"}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-primary">
                <SpecIcon name={display.propertiesIcon} />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-(--foreground-heading)">
                  Eigenschaften
                </p>
                <ul className="mt-2.5 space-y-2 text-sm leading-snug text-(--foreground-muted)">
                  {display.propertyLines.map((line, i) => (
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
