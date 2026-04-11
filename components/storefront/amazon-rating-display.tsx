type Props = {
  average: number;
  count: number;
  reviewUrl: string | null;
  /** Ohne Fußzeile zum manuellen Pflegen (z. B. Produktkarten) */
  compact?: boolean;
  /** z. B. mt-0 wenn der äußere Slot schon Abstand setzt */
  className?: string;
};

export function AmazonRatingDisplay({ average, count, reviewUrl, compact, className }: Props) {
  const avgStr = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
  const countStr = new Intl.NumberFormat("de-DE").format(count);

  return (
    <div className={`mt-3 text-sm leading-snug text-(--foreground-muted) ${className ?? ""}`}>
      <p>
        <span className="text-amber-500" aria-hidden>
          ★
        </span>{" "}
        <span className="font-semibold text-(--foreground-heading)">{avgStr}</span>
        <span> · {countStr} Bewertungen</span>
        {reviewUrl ? (
          <>
            {" "}
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-[1] text-primary underline-offset-4 hover:underline pointer-events-auto"
            >
              bei Amazon
            </a>
          </>
        ) : null}
      </p>
      {!compact ? (
        <p className="mt-1 text-xs text-(--foreground-muted)">
          Überblick zu Kundenbewertungen auf Amazon; hier manuell gepflegt und nicht live synchronisiert.
        </p>
      ) : null}
    </div>
  );
}
