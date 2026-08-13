import { Gem, Headphones, Heart, Leaf, PawPrint, Shield, Sparkles, Truck } from "lucide-react";
import { formatPriceWholeEurosWhenInteger } from "@/lib/catalog/format";
import type { PdpResolvedUsp, PdpSpecIcon } from "@/lib/catalog/pdp-resolve-display";

const lineIconClass = "size-[22px] shrink-0 text-primary";

function FlagDe() {
  return (
    <span
      className="inline-flex h-9 w-11 shrink-0 flex-col overflow-hidden rounded border border-(--surface-muted)"
      aria-hidden
    >
      <span className="h-1/3 w-full bg-black" />
      <span className="h-1/3 w-full bg-[#DD0000]" />
      <span className="h-1/3 w-full bg-[#FFCE00]" />
    </span>
  );
}

/** Einheitliche Höhe für Icon/Flaggen-Slot, damit Überschriften bündig starten. */
const uspIconSlotClass = "flex h-11 w-11 shrink-0 items-center justify-center";

function UspIcon({ name }: { name: PdpSpecIcon }) {
  if (name === "flag-de") return <FlagDe />;
  const circle =
    `${uspIconSlotClass} rounded-full border border-(--surface-muted) bg-white text-primary shadow-sm`;
  const iconProps = {
    className: "size-[22px] stroke-[1.5]",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "leaf":
      return (
        <span className={circle}>
          <Leaf {...iconProps} />
        </span>
      );
    case "heart":
      return (
        <span className={circle}>
          <Heart {...iconProps} />
        </span>
      );
    case "gem":
      return (
        <span className={circle}>
          <Gem {...iconProps} />
        </span>
      );
    case "paw":
      return (
        <span className={circle}>
          <PawPrint {...iconProps} />
        </span>
      );
    case "shield":
      return (
        <span className={circle}>
          <Shield {...iconProps} />
        </span>
      );
    case "sparkles":
    default:
      return (
        <span className={circle}>
          <Sparkles {...iconProps} />
        </span>
      );
  }
}

/**
 * USPs aus Produktdaten (Herkunft, Theme-Label, Verkaufsargumente).
 * Freie Argumente erscheinen nur hier — nicht zusätzlich als Stichpunktliste.
 * Ohne Daten: nichts rendern — keine hartcodierten Katzen-/Schmuck-Texte.
 */
export function ProductPdpUspRow({
  usps,
  className = "",
}: {
  usps: PdpResolvedUsp[];
  className?: string;
}) {
  if (usps.length === 0) return null;

  const cols =
    usps.length === 1
      ? "sm:grid-cols-1"
      : usps.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <ul
      className={`mt-6 grid grid-cols-1 gap-8 border-t border-(--surface-muted) pt-6 text-center ${cols} sm:gap-6 sm:pt-5 ${className}`}
    >
      {usps.map((usp) => (
        <li key={usp.id} className="flex flex-col items-center gap-2">
          <div className={uspIconSlotClass}>
            <UspIcon name={usp.icon} />
          </div>
          <div className="max-w-[14rem]">
            <p className="text-sm font-semibold text-(--foreground-heading)">{usp.title}</p>
            {usp.subtitle ? (
              <p className="mt-1 text-xs leading-snug text-(--foreground-muted)">{usp.subtitle}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Volle Breite über dem Footer: Versand, Nachhaltigkeit, Support – gleichmäßig verteilt.
 * {@link freeShippingFromSubtotalGrossCents} entspricht „Kostenloser Versand ab …“ unter /admin/versand.
 */
export function ProductPdpTrustFooterBar({
  freeShippingFromSubtotalGrossCents,
}: {
  freeShippingFromSubtotalGrossCents: number | null;
}) {
  const showFreeFrom =
    freeShippingFromSubtotalGrossCents != null && freeShippingFromSubtotalGrossCents > 0;

  return (
    <section
      className="relative left-1/2 mt-14 w-screen max-w-[100vw] -translate-x-1/2 border-t border-(--surface-muted) bg-[#eef1ee] py-8 md:mt-16 md:py-10"
      aria-label="Service und Versprechen"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:grid-cols-3 sm:gap-6 md:gap-10">
        <div className="flex gap-3 sm:flex-col sm:items-center sm:text-center md:flex-row md:items-start md:text-left">
          <Truck className={`${lineIconClass} mt-0.5 sm:mt-0`} strokeWidth={1.5} aria-hidden />
          <p className="text-sm leading-snug text-(--foreground-muted)">
            <span className="font-medium text-(--foreground-heading)">Kostenloser Versand</span>
            {showFreeFrom ? (
              <>
                <span className="text-(--foreground-muted)"> · </span>
                ab {formatPriceWholeEurosWhenInteger(freeShippingFromSubtotalGrossCents, "EUR")}{" "}
                Bestellwert
              </>
            ) : null}
          </p>
        </div>
        <div className="flex gap-3 sm:flex-col sm:items-center sm:text-center md:flex-row md:items-start md:text-left">
          <Leaf className={`${lineIconClass} mt-0.5 sm:mt-0`} strokeWidth={1.5} aria-hidden />
          <p className="text-sm leading-snug text-(--foreground-muted)">
            <span className="font-medium text-(--foreground-heading)">Klimaneutral verpackt</span>
          </p>
        </div>
        <div className="flex gap-3 sm:flex-col sm:items-center sm:text-center md:flex-row md:items-start md:text-left">
          <Headphones className={`${lineIconClass} mt-0.5 sm:mt-0`} strokeWidth={1.5} aria-hidden />
          <p className="text-sm leading-snug text-(--foreground-muted)">
            <span className="font-medium text-(--foreground-heading)">Persönlicher Support</span>
          </p>
        </div>
      </div>
    </section>
  );
}
