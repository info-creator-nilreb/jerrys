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
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { cartLineCommerceRules, getCartWithLines } from "@/lib/cart/cart-queries";
import { getShippingCountriesForStorefront } from "@/lib/shop/shipping-countries-for-storefront";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
};

const paypalReturnErrors: Record<string, string> = {
  fehlt: "Die PayPal-Rückkehr enthielt keine Zahlungsinformationen. Bitte erneut bestellen oder den Support kontaktieren.",
  capture: "PayPal konnte die Zahlung nicht abschließen. Bitte erneut versuchen.",
  bestellung: "Die Bestellung wurde nicht gefunden. Bitte den Support mit deiner Bestellnummer kontaktieren.",
  betrag: "Der gezahlte Betrag passt nicht zur Bestellung. Bitte den Support kontaktieren.",
  finalisierung: "Die Bestellung konnte nach der Zahlung nicht abgeschlossen werden. Bitte den Support kontaktieren.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ paypal?: string; payment?: string }>;
}) {
  const sp = await searchParams;
  const paypalCode = sp.paypal;
  const paypalCancelled = paypalCode === "abbruch";
  const paypalError =
    !paypalCancelled && typeof paypalCode === "string" && paypalCode.length > 0
      ? (paypalReturnErrors[paypalCode] ?? "Die PayPal-Zahlung ist fehlgeschlagen. Bitte erneut versuchen.")
      : null;

  if (!isPayPalConfigured()) {
    redirect("/warenkorb?grund=paypal_nicht_konfiguriert");
  }

  const cartId = await getCartIdFromCookie();
  const cart = cartId ? await getCartWithLines(cartId) : null;
  const activeLines = cart?.lines.filter((l) => l.product.isActive) ?? [];

  if (!activeLines.length) {
    redirect("/warenkorb");
  }

  const currency = activeLines[0]!.product.currency;
  const idempotencyKey = randomUUID();

  const summaryLines: CheckoutSummaryLine[] = activeLines.map((l) => {
    const commerce = cartLineCommerceRules(l);
    return {
      id: l.id,
      quantity: l.quantity,
      product: {
        title: l.product.title,
        priceGrossCents: commerce.priceGrossCents,
        taxRatePercent: commerce.taxRatePercent,
        images: l.product.images,
      },
    };
  });

  const shopShip = await getShopShippingSettings();
  const { countries: allowedShippingCountries, preferredCountry } =
    await getShippingCountriesForStorefront();
  if (!allowedShippingCountries.length) {
    redirect("/warenkorb?grund=versand_nicht_konfiguriert");
  }
  const initialShippingCountry = preferredCountry;

  const prefillPaypal = sp.payment === "paypal";

  const session = await getCustomerSession();
  // Adressbuch gilt nur für verifizierte, aktive Konten — sonst bleibt der Checkout wie für Gäste.
  const verifiedCustomerId = session
    ? await getVerifiedActiveCustomerId(session.customerId)
    : null;
  const [addressPrefill, savedAddresses] = verifiedCustomerId
    ? await Promise.all([
        getCheckoutAddressPrefillForCustomer(verifiedCustomerId),
        listCustomerAddresses(verifiedCustomerId),
      ])
    : [null, []];

  return (
    <div className="pb-12 lg:pb-0">
      <div className="mx-auto max-w-6xl px-4 pt-24 md:pt-28">
      <StorefrontBreadcrumbs
        items={[
          { href: "/", label: "Start" },
          { href: "/warenkorb", label: "Warenkorb" },
          { label: "Checkout" },
        ]}
      />
      {paypalCancelled ? (
        <div
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          PayPal-Zahlung abgebrochen. Dein Warenkorb und deine Eingaben sind noch vorhanden — du kannst eine
          andere Zahlungsart wählen oder den Checkout erneut absenden.
        </div>
      ) : null}
      {paypalError ? (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {paypalError}
        </div>
      ) : null}
      </div>
      <CheckoutForm
          idempotencyKey={idempotencyKey}
          lines={summaryLines}
          shippingRatesByCountry={shopShip.shippingRatesCentsByCountry}
          freeShippingFromSubtotalGrossCents={shopShip.freeShippingFromSubtotalGrossCents}
          initialShippingCountry={initialShippingCountry}
          currency={currency}
          allowedShippingCountries={allowedShippingCountries}
          payPalConfigured={isPayPalConfigured()}
          payPalClientId={process.env.PAYPAL_CLIENT_ID?.trim() ?? ""}
          prefillPaypal={prefillPaypal}
          restoreFormDraft={paypalCancelled || Boolean(paypalError)}
          addressPrefill={addressPrefill}
          savedAddresses={savedAddresses}
          canSaveAddressToAccount={Boolean(verifiedCustomerId)}
          showContactLogin={!session}
        />
    </div>
  );
}
