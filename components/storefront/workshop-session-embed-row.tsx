import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { StorefrontWorkshopSessionListItem } from "@/features/workshops";
import { formatWorkshopSessionDateTimeCompact } from "@/lib/workshop/format-session-datetime";

/**
 * Schlanke Terminzeile für Landingpages / PDP.
 * Nur Scan-Infos (wann + freie Plätze); Details/Buchung auf der Terminseite.
 */
export function WorkshopSessionEmbedRow({
  session,
}: {
  session: StorefrontWorkshopSessionListItem;
}) {
  const when = formatWorkshopSessionDateTimeCompact(session.startsAt, session.timezone);
  const seatsLabel =
    session.availability === "sold_out"
      ? "Ausgebucht"
      : session.seatsRemaining === 1
        ? "1 Platz frei"
        : `${session.seatsRemaining} Plätze frei`;

  const seatsTone =
    session.availability === "sold_out"
      ? "text-(--foreground-muted)"
      : session.seatsRemaining <= 2
        ? "font-semibold text-(--foreground-heading)"
        : "text-(--foreground-heading)";

  return (
    <Link
      href={`/termine/${session.id}`}
      className="group flex min-h-12 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-(--surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      aria-label={`${when}, ${seatsLabel} — Details ansehen`}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-(--foreground-heading)">
        {when}
      </span>
      <span className={`shrink-0 text-sm tabular-nums ${seatsTone}`}>{seatsLabel}</span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary">
        Details
        <ChevronRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
          strokeWidth={2}
        />
      </span>
    </Link>
  );
}
