import Link from "next/link";
import { CustomerWorkshopBookingCard } from "@/components/storefront/customer-workshop-booking-card";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listWorkshopBookingsForCustomer } from "@/features/workshops";

export const metadata = {
  title: "Termine",
  robots: { index: false, follow: false },
};

function partitionBookings(
  rows: Awaited<ReturnType<typeof listWorkshopBookingsForCustomer>>,
  now: Date,
) {
  const upcoming: typeof rows = [];
  const past: typeof rows = [];

  for (const row of rows) {
    const isPast =
      row.status === "cancelled" ||
      row.status === "attended" ||
      row.status === "no_show" ||
      row.status === "refunded" ||
      row.status === "expired" ||
      row.startsAt.getTime() < now.getTime();
    if (isPast) past.push(row);
    else upcoming.push(row);
  }

  return { upcoming, past };
}

export default async function CustomerWorkshopBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ storniert?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const sp = await searchParams;
  const cancelledBanner = sp.storniert === "1";

  let loadError: string | null = null;
  let bookings: Awaited<ReturnType<typeof listWorkshopBookingsForCustomer>> = [];
  try {
    bookings = await listWorkshopBookingsForCustomer(session.customerId);
  } catch {
    loadError = "Termine konnten gerade nicht geladen werden. Bitte später erneut versuchen.";
  }

  const now = new Date();
  const { upcoming, past } = partitionBookings(bookings, now);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Termine
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Deine Gruppentermine und Workshop-Buchungen — nur mit verifiziertem Konto.
        </p>
      </header>

      {cancelledBanner ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          Die Buchung wurde storniert.
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      ) : null}

      {!loadError && bookings.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-8 text-center text-sm text-(--foreground-muted)">
          <p>Du hast noch keine Terminbuchungen.</p>
          <Link href="/" className={`${customerAuthSecondaryLinkClass} mt-3 inline-flex`}>
            Zur Startseite
          </Link>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-(--foreground-heading)">Kommende Termine</h2>
          <ul className="space-y-4">
            {upcoming.map((b) => (
              <li key={b.id}>
                <CustomerWorkshopBookingCard booking={b} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-(--foreground-heading)">Vergangene Termine</h2>
          <ul className="space-y-4">
            {past.map((b) => (
              <li key={b.id}>
                <CustomerWorkshopBookingCard booking={b} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
