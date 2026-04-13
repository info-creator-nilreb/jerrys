import { Star } from "lucide-react";

function starFillForIndex(average: number, index: number): number {
  return Math.min(1, Math.max(0, average - index));
}

function StarGlyph({ fill }: { fill: number }) {
  const w = `${Math.min(100, Math.max(0, fill * 100))}%`;
  const size = 14;
  return (
    <span
      className="relative inline-flex h-[1.15em] w-[1.15em] shrink-0 items-center justify-center leading-none"
      aria-hidden
    >
      <Star className="text-amber-200" size={size} fill="currentColor" strokeWidth={0} />
      <span className="absolute left-0 top-0 h-full overflow-hidden text-amber-500" style={{ width: w }}>
        <span className="flex h-full w-[1.15em] items-center justify-center">
          <Star size={size} fill="currentColor" strokeWidth={0} />
        </span>
      </span>
    </span>
  );
}

function StarRow({ average }: { average: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarGlyph key={i} fill={starFillForIndex(average, i)} />
      ))}
    </span>
  );
}

type Props = {
  average: number;
  count: number;
  reviewUrl: string | null;
  /** Kompaktere Darstellung (z. B. Produktkarten). */
  compact?: boolean;
  /** PDP: Amazon-Link dezent unter der Zeile statt als grüner Primärlink in der Zeile. */
  linkTreatment?: "default" | "subtle";
  /** z. B. mt-0 wenn der äußere Slot schon Abstand setzt */
  className?: string;
};

export function AmazonRatingDisplay({
  average,
  count,
  reviewUrl,
  compact,
  linkTreatment = "default",
  className,
}: Props) {
  const avgStr = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
  const countStr = new Intl.NumberFormat("de-DE").format(count);

  return (
    <div
      className={`mt-3 leading-snug text-(--foreground-muted) ${compact ? "text-xs" : "text-sm"} ${className ?? ""}`}
    >
      <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? "gap-x-1.5" : ""}`}>
        <span className={compact ? "inline-flex origin-left scale-90" : ""}>
          <StarRow average={average} />
        </span>
        <span className="sr-only">
          {avgStr} von 5 Sternen, {countStr} Bewertungen
        </span>
        <span aria-hidden className="font-semibold text-(--foreground-heading)">
          {avgStr}
        </span>
        <span aria-hidden>
          ({countStr} Bewertungen)
        </span>
        {reviewUrl && linkTreatment === "default" ? (
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-[1] text-primary underline-offset-4 hover:underline pointer-events-auto"
          >
            {compact ? "bei Amazon" : "bei Amazon ansehen"}
          </a>
        ) : null}
      </p>
      {reviewUrl && linkTreatment === "subtle" ? (
        <p className="mt-2">
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-(--foreground-muted) underline decoration-(--surface-muted) underline-offset-2 transition hover:text-(--foreground-heading) hover:decoration-(--foreground-muted)"
          >
            Bewertungen bei Amazon ansehen
          </a>
        </p>
      ) : null}
    </div>
  );
}
