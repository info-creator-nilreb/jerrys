import Link from "next/link";
import { randomUUID } from "crypto";
import { notFound } from "next/navigation";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import type { CheckoutSummaryLine } from "@/components/storefront/checkout-summary-aside";
import { WorkshopCheckoutForm } from "@/components/storefront/workshop-checkout-form";
import {
  getCheckoutAddressPrefillForCustomer,
  getVerifiedActiveCustomerId,
  listCustomerAddresses,
} from "@/features/customers";
import { getWorkshopHoldForCheckout } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getWorkshopBookingHoldIdFromCookie } from "@/lib/workshop/workshop-booking-cookie";
import { getShippingCountriesForStorefront } from "@/lib/shop/shipping-countries-for-storefront";
import { isPayPalConfigured, isPayPalSepaDebitEnabled } from "@/lib/payments/paypal-config";
import { isTermineFeatureEnabled } from "@/lib/shop/termine-feature";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";
import { getWorkshopCheckoutCatalogLine } from "@/lib/workshop/workshop-checkout-catalog-query";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Termin-Checkout",
};

/**
 * Kein `redirect()` und kein CheckoutForm/useActionState —
 * beides hat in Production React #441 ausgelöst.
 */
export default async function WorkshopCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  if (!(await isTermineFeatureEnabled())) {
    notFound();
  }

  const sp = await searchParams;
  const checkoutError = sp.fehler?.trim() || null;

  const bookingId = await getWorkshopBookingHoldIdFromCookie();
  if (!bookingId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 md:py-28">
        <h1 className="text-xl font-semibold text-(--foreground-heading)">Keine Reservierung</h1>
        <p className="mt-3 text-sm text-(--foreground-muted)">
          Es liegt keine aktive Platz-Reservierung vor. Bitte wähle erneut einen Termin.
        </p>
        <Link
          href="/termine"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover)"
        >
          Zu den Terminen
        </Link>
      </div>
    );
  }

  const hold = await getWorkshopHoldForCheckout(bookingId);
  if (!hold) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 md:py-28">
        <h1 className="text-xl font-semibold text-(--foreground-heading)">Reservierung abgelaufen</h1>
        <p className="mt-3 text-sm text-(--foreground-muted)">
          Deine Platz-Reservierung ist nicht mehr gültig. Bitte buche den Termin erneut.
        </p>
        <Link
          href="/termine"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover)"
        >
          Zu den Terminen
        </Link>
      </div>
    );
  }

  if (!isPayPalConfigured() && hold.unitPriceCents > 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 md:py-28">
        <h1 className="text-xl font-semibold text-(--foreground-heading)">Zahlung nicht verfügbar</h1>
        <p className="mt-3 text-sm text-(--foreground-muted)">
          Online-Zahlung ist derzeit nicht konfiguriert. Bitte später erneut versuchen.
        </p>
        <Link
          href={`/termine/${hold.sessionId}`}
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover)"
        >
          Zurück zum Termin
        </Link>
      </div>
    );
  }

  const { countries: allowedShippingCountries, preferredCountry } =
    await getShippingCountriesForStorefront();
  const catalog = await getWorkshopCheckoutCatalogLine();
  const taxRatePercent = catalog?.taxRatePercent ?? 19;

  const when = formatWorkshopSessionDateTime(hold.startsAt, hold.timezone);
  const lineTotal = hold.unitPriceCents * hold.seatCount;

  const summaryLines: CheckoutSummaryLine[] = [
    {
      id: hold.bookingId,
      quantity: hold.seatCount,
      product: {
        title: `${hold.title} (${when})`,
        priceGrossCents: hold.unitPriceCents,
        taxRatePercent,
        images: [],
      },
    },
  ];

  const session = await getCustomerSession();
  const verifiedCustomerId = session
    ? await getVerifiedActiveCustomerId(session.customerId)
    : null;
  const [addressPrefill, savedAddresses] = verifiedCustomerId
    ? await Promise.all([
        getCheckoutAddressPrefillForCustomer(verifiedCustomerId),
        listCustomerAddresses(verifiedCustomerId),
      ])
    : [null, []];

  const initialShippingCountry =
    addressPrefill?.shippingCountry &&
    allowedShippingCountries.some((c) => c.code === addressPrefill.shippingCountry)
      ? addressPrefill.shippingCountry
      : preferredCountry;

  const holdDeadlineLabel = formatWorkshopSessionDateTime(hold.holdExpiresAt, hold.timezone);

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs
        items={[
          { href: "/", label: "Start" },
          { href: "/termine", label: "Termine" },
          { href: `/termine/${hold.sessionId}`, label: hold.title },
          { label: "Checkout" },
        ]}
      />

      <p className="mt-4 text-sm text-(--foreground-muted)" role="status">
        Reservierung gültig bis {holdDeadlineLabel}.
        {lineTotal === 0 ? " Kostenloser Termin, keine Online-Zahlung nötig." : null}
      </p>

      <div className="mt-4">
        <WorkshopCheckoutForm
          idempotencyKey={randomUUID()}
          workshopBookingId={hold.bookingId}
          lines={summaryLines}
          currency={hold.currency}
          allowedShippingCountries={allowedShippingCountries}
          initialShippingCountry={initialShippingCountry}
          addressPrefill={addressPrefill}
          savedAddresses={savedAddresses}
          canSaveAddressToAccount={Boolean(verifiedCustomerId)}
          showContactLogin={!session}
          payPalConfigured={isPayPalConfigured()}
          sepaAvailable={isPayPalSepaDebitEnabled()}
          checkoutError={checkoutError}
        />
      </div>
    </div>
  );
}
