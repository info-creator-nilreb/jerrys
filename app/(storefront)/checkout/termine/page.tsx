import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
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

export default async function WorkshopCheckoutPage() {
  const bookingId = await getWorkshopBookingHoldIdFromCookie();
  if (!bookingId) {
    redirect("/termine?checkout=fehlt");
  }

  const hold = await getWorkshopHoldForCheckout(bookingId);
  if (!hold) {
    redirect("/termine?hold=abgelaufen");
  }

  if (!isPayPalConfigured() && hold.unitPriceCents > 0) {
    redirect("/termine?grund=paypal_nicht_konfiguriert");
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
