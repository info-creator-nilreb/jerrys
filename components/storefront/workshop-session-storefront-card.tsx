import Link from "next/link";
import { Users } from "lucide-react";
import type { StorefrontWorkshopSessionListItem } from "@/features/workshops";
import {
  formatDurationLabel,
  selfCancelDeadlineForStorefrontSession,
} from "@/features/workshops";
import { WorkshopSessionLocationBlock } from "@/components/storefront/workshop-session-location-block";
import { formatPrice } from "@/lib/catalog/format";
import {
  formatSelfCancelDeadline,
  formatWorkshopSessionDateTime,
} from "@/lib/workshop/format-session-datetime";

function AvailabilityBadge({
  label,
  availability,
}: {
  label: string;
  availability: StorefrontWorkshopSessionListItem["availability"];
}) {
  const tone =
    availability === "sold_out"
      ? "bg-(--surface-soft) text-(--foreground-muted)"
      : availability === "minimum_not_met"
        ? "bg-amber-100 text-amber-950"
        : "bg-green-100 text-green-900";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function WorkshopSessionStorefrontCard({
  session,
  compact = false,
}: {
  session: StorefrontWorkshopSessionListItem;
  compact?: boolean;
}) {
  const when = formatWorkshopSessionDateTime(session.startsAt, session.timezone);
  const duration = formatDurationLabel(session.durationMinutes);
  const cancelDeadline = formatSelfCancelDeadline(
    selfCancelDeadlineForStorefrontSession(session),
    session.timezone,
  );
  const priceLabel =
    session.priceCentsPerSeat > 0
      ? formatPrice(session.priceCentsPerSeat, session.currency)
      : "Kostenlos";

  return (
    <article className="rounded-lg border border-(--surface-muted) bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">{session.title}</h2>
        <AvailabilityBadge label={session.availabilityLabel} availability={session.availability} />
      </div>

      <p className="mt-2 text-sm font-medium text-(--foreground-heading)">{when}</p>
      <p className="text-xs text-(--foreground-muted)">
        {session.timezone} · {duration}
      </p>

      <dl className={`mt-4 grid gap-2 text-sm text-(--foreground-muted) ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className={compact ? "" : "sm:col-span-2"}>
          <WorkshopSessionLocationBlock location={session} />
        </div>
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {session.seatsRemaining} von {session.capacity} Plätzen frei
            {session.minimumParticipants > 1 ? (
              <> · Mindestteilnehmer {session.minimumParticipants}</>
            ) : null}
          </span>
        </div>
      </dl>

      <p className="mt-3 text-sm font-medium text-(--foreground-heading)">{priceLabel} pro Platz</p>

      {!compact ? (
        <p className="mt-2 text-xs text-(--foreground-muted)">
          Selbststornierung bis {cancelDeadline} möglich (sofern gebucht).
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/termine/${session.id}`}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Details
        </Link>
        {session.availability !== "sold_out" ? (
          <span className="inline-flex min-h-11 items-center text-sm text-(--foreground-muted)">
            Online-Buchung folgt in Kürze
          </span>
        ) : null}
      </div>
    </article>
  );
}
