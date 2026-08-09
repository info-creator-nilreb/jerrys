import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { CustomerWorkshopBookingCancelForm } from "@/components/storefront/customer-workshop-booking-cancel-form";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getWorkshopBookingForCustomer, workshopBookingStatusLabel } from "@/features/workshops";
import { formatPrice } from "@/lib/catalog/format";
import {
  formatSelfCancelDeadline,
  formatWorkshopSessionDateTime,
} from "@/lib/workshop/format-session-datetime";

export const metadata = {
  title: "Termindetails",
  robots: { index: false, follow: false },
};

export default async function CustomerWorkshopBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const { bookingId: raw } = await params;
  const bookingId = decodeURIComponent(raw ?? "").trim();
  if (!bookingId) notFound();

  let booking: Awaited<ReturnType<typeof getWorkshopBookingForCustomer>> = null;
  try {
    booking = await getWorkshopBookingForCustomer({
      customerId: session.customerId,
      bookingId,
    });
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-(--foreground-heading)">Termindetails</h1>
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Die Buchung konnte gerade nicht geladen werden.
        </p>
        <Link href="/konto/termine" className={customerAuthSecondaryLinkClass}>
          Zurück zu Terminen
        </Link>
      </div>
    );
  }

  if (!booking) notFound();

  const when = formatWorkshopSessionDateTime(booking.startsAt, booking.timezone);
  const deadline = formatSelfCancelDeadline(booking.selfCancelDeadlineAt, booking.timezone);
  const lineTotal = booking.unitPriceCents * booking.seatCount;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/konto/termine" className={`${customerAuthSecondaryLinkClass} text-sm`}>
          ← Alle Termine
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          {booking.title}
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">{when}</p>
      </header>

      <section className="rounded-lg border border-(--surface-muted) bg-white p-5 shadow-sm">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-(--foreground-heading)">Status</dt>
            <dd className="mt-1 text-(--foreground-muted)">
              {workshopBookingStatusLabel(booking.status)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-(--foreground-heading)">Kontakt-E-Mail</dt>
            <dd className="mt-1 text-(--foreground-muted)">{booking.contactEmail}</dd>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="font-medium text-(--foreground-heading)">Ort</dt>
              <dd className="mt-1 text-(--foreground-muted)">{booking.location}</dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="font-medium text-(--foreground-heading)">Plätze</dt>
              <dd className="mt-1 text-(--foreground-muted)">
                {booking.seatCount === 1 ? "1 Platz" : `${booking.seatCount} Plätze`}
              </dd>
            </div>
          </div>
          <div>
            <dt className="font-medium text-(--foreground-heading)">Preis</dt>
            <dd className="mt-1 text-(--foreground-muted)">
              {booking.unitPriceCents > 0
                ? formatPrice(lineTotal, booking.currency)
                : "Kostenlos"}
            </dd>
          </div>
        </dl>
      </section>

      {booking.canSelfCancel ? (
        <section className="space-y-4 rounded-lg border border-(--surface-muted) p-5">
          <h2 className="text-lg font-semibold text-(--foreground-heading)">Stornieren</h2>
          <p className="text-sm text-(--foreground-muted)">
            Du kannst diese Buchung bis{" "}
            <span className="font-medium text-(--foreground-heading)">{deadline}</span> selbst
            stornieren.
          </p>
          <CustomerWorkshopBookingCancelForm bookingId={booking.id} />
        </section>
      ) : booking.status === "confirmed" && booking.selfCancelBlockedMessage ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {booking.selfCancelBlockedMessage}
        </p>
      ) : null}
    </div>
  );
}
