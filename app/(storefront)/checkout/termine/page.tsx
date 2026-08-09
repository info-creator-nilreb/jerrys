import Link from "next/link";
import { randomUUID } from "crypto";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import type { CheckoutSummaryLine } from "@/components/storefront/checkout-summary-aside";
import {
  getCheckoutAddressPrefillForCustomer,
  getVerifiedActiveCustomerId,
  listCustomerAddresses,
} from "@/features/customers";
import { getWorkshopHoldForCheckout } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getWorkshopBookingHoldIdFromCookie } from "@/lib/workshop/workshop-booking-cookie";
import { getShippingCountriesForStorefront } from "@/lib/shop/shipping-countries-for-storefront";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Termin-Checkout",
};

/**
 * Kein `redirect()` in dieser Page — NEXT_REDIRECT während RSC kann in Production
 * als Minified React error #441 in der Error Boundary landen.
 */
export default async function WorkshopCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
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

  const shopShip = await getShopShippingSettings();
  const { countries: allowedShippingCountries, preferredCountry } =
    await getShippingCountriesForStorefront();

  const when = formatWorkshopSessionDateTime(hold.startsAt, hold.timezone);
  const lineTotal = hold.unitPriceCents * hold.seatCount;

  const summaryLines: CheckoutSummaryLine[] = [
    {
      id: hold.bookingId,
      quantity: hold.seatCount,
      product: {
        title: `${hold.title} (${when})`,
        priceGrossCents: hold.unitPriceCents,
        taxRatePercent: 19,
        images: [],
      },
    },
  ];

  const idempotencyKey = randomUUID();
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

      {checkoutError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {checkoutError}
        </p>
      ) : null}

      <div className="mt-4">
        <CheckoutForm
          idempotencyKey={idempotencyKey}
          lines={summaryLines}
          shippingRatesByCountry={shopShip.shippingRatesCentsByCountry}
          freeShippingFromSubtotalGrossCents={shopShip.freeShippingFromSubtotalGrossCents}
          initialShippingCountry={preferredCountry}
          currency={hold.currency}
          allowedShippingCountries={allowedShippingCountries}
          payPalConfigured={isPayPalConfigured()}
          payPalClientId={process.env.PAYPAL_CLIENT_ID?.trim() ?? ""}
          addressPrefill={addressPrefill}
          savedAddresses={savedAddresses}
          canSaveAddressToAccount={Boolean(verifiedCustomerId)}
          workshopBookingId={hold.bookingId}
          hidePromotionPanel
          checkoutTitle="Termin-Checkout"
        />
      </div>
    </div>
  );
}
