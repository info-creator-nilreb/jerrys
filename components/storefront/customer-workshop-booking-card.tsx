import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import type { CustomerWorkshopBookingListItem } from "@/features/workshops";
import { formatPrice } from "@/lib/catalog/format";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";

function WorkshopBookingStatusBadge({ label, status }: { label: string; status: string }) {
  const cancelled = status === "cancelled";
  return (
    <span
      className={
        cancelled
          ? "inline-flex rounded-full bg-(--surface-soft) px-2.5 py-0.5 text-xs font-medium text-(--foreground-muted)"
          : "inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-900"
      }
    >
      {label}
    </span>
  );
}

export function CustomerWorkshopBookingCard({ booking }: { booking: CustomerWorkshopBookingListItem }) {
  const when = formatWorkshopSessionDateTime(booking.startsAt, booking.timezone);
  const lineTotal = booking.unitPriceCents * booking.seatCount;

  return (
    <article className="rounded-lg border border-(--surface-muted) bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-(--foreground-heading)">{booking.title}</h2>
          <p className="mt-1 text-sm text-(--foreground-muted)">{when}</p>
        </div>
        <WorkshopBookingStatusBadge label={booking.statusLabel} status={booking.status} />
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-(--foreground-muted) sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-(--foreground-muted)" aria-hidden />
          <span>{booking.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 shrink-0 text-(--foreground-muted)" aria-hidden />
          <span>
            {booking.seatCount === 1 ? "1 Platz" : `${booking.seatCount} Plätze`}
          </span>
        </div>
      </dl>

      {booking.unitPriceCents > 0 ? (
        <p className="mt-3 text-sm font-medium text-(--foreground-heading)">
          {formatPrice(lineTotal, booking.currency)}
        </p>
      ) : (
        <p className="mt-3 text-sm text-(--foreground-muted)">Kostenlos</p>
      )}

      <Link
        href={`/konto/termine/${booking.id}`}
        className={`${customerAuthSecondaryLinkClass} mt-4 inline-flex min-h-11 items-center`}
      >
        Details ansehen
      </Link>
    </article>
  );
}
