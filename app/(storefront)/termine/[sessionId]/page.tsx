import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import {
  getPublishedWorkshopSessionForStorefront,
  selfCancelDeadlineForStorefrontSession,
  formatDurationLabel,
} from "@/features/workshops";
import { WorkshopSessionLocationBlock } from "@/components/storefront/workshop-session-location-block";
import { WorkshopBookSeatsPanel } from "@/components/storefront/workshop-book-seats-panel";
import { WorkshopEventJsonLd } from "@/components/storefront/workshop-event-json-ld";
import { formatPrice } from "@/lib/catalog/format";
import {
  formatSelfCancelDeadline,
  formatWorkshopSessionDateTime,
} from "@/lib/workshop/format-session-datetime";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { buildStorefrontMetadata } from "@/lib/site/storefront-metadata";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getPublishedWorkshopSessionForStorefront(sessionId);
  if (!session) return { title: "Termin" };
  const when = formatWorkshopSessionDateTime(session.startsAt, session.timezone);
  return buildStorefrontMetadata({
    title: session.title,
    description: `${session.locationLabel} — ${when}`,
    path: `/termine/${session.id}`,
    openGraphType: "website",
  });
}

export default async function StorefrontWorkshopSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ buchung?: string; msg?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const bookingErrorMessage =
    sp.buchung === "fehler" && sp.msg?.trim() ? sp.msg.trim() : null;
  const [session, shopSettings] = await Promise.all([
    getPublishedWorkshopSessionForStorefront(sessionId),
    getShopSettings(),
  ]);
  if (!session) notFound();

  const when = formatWorkshopSessionDateTime(session.startsAt, session.timezone);
  const duration = formatDurationLabel(session.durationMinutes);
  const cancelDeadline = formatSelfCancelDeadline(
    selfCancelDeadlineForStorefrontSession(session),
    session.timezone,
  );

  return (
    <div className={`mx-auto max-w-3xl px-4 ${storefrontMainPagePaddingClass}`}>
      <WorkshopEventJsonLd
        name={session.title}
        description={session.description}
        sessionId={session.id}
        startsAt={session.startsAt}
        endsAt={session.endsAt}
        timezone={session.timezone}
        locationLabel={session.locationLabel}
        locationLine1={session.locationLine1}
        locationLine2={session.locationLine2}
        locationZip={session.locationZip}
        locationCity={session.locationCity}
        locationCountry={session.locationCountry}
        priceCentsPerSeat={session.priceCentsPerSeat}
        currency={session.currency}
        seatsRemaining={session.seatsRemaining}
        shopName={shopSettings.shopName}
      />
      <Link href="/termine" className="text-sm font-medium text-primary hover:underline">
        ← Alle Termine
      </Link>

      <header className="mt-4 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading)">
          {session.title}
        </h1>
        <p className="text-base font-medium text-(--foreground-heading)">{when}</p>
        <p className="text-sm text-(--foreground-muted)">
          {session.timezone} · {duration}
        </p>
      </header>

      <div className="mt-8 space-y-6">
        {session.description ? (
          <div className="prose prose-sm max-w-none text-(--foreground-muted)">
            <p className="whitespace-pre-wrap">{session.description}</p>
          </div>
        ) : null}

        <dl className="grid gap-4 rounded-lg border border-(--surface-muted) bg-white p-5 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <WorkshopSessionLocationBlock location={session} />
          </div>
          <div className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="font-medium text-(--foreground-heading)">Plätze</dt>
              <dd className="text-(--foreground-muted)">
                {session.seatsRemaining} frei von {session.capacity}
              </dd>
            </div>
          </div>
          <div>
            <dt className="font-medium text-(--foreground-heading)">Preis pro Platz</dt>
            <dd className="text-(--foreground-muted)">
              {session.priceCentsPerSeat > 0
                ? formatPrice(session.priceCentsPerSeat, session.currency)
                : "Kostenlos"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-(--foreground-heading)">Stornierung</dt>
            <dd className="text-(--foreground-muted)">
              Nach der Buchung kannst du bis {cancelDeadline} selbst stornieren (im Kundenkonto).
            </dd>
          </div>
        </dl>

        {session.seatsRemaining > 0 && session.availability !== "sold_out" ? (
          <WorkshopBookSeatsPanel
            sessionId={session.id}
            seatsRemaining={session.seatsRemaining}
            maxSeatsPerBooking={session.maxSeatsPerBooking}
            capacity={session.capacity}
            bookingErrorMessage={bookingErrorMessage}
          />
        ) : null}
      </div>
    </div>
  );
}
