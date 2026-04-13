import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import type { CheckoutSummaryLine } from "@/components/storefront/checkout-summary-aside";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines } from "@/lib/cart/cart-queries";
import { labelForShippingCountryCode } from "@/lib/catalog/shipping-countries-catalog";
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
  const paypalError =
    typeof paypalCode === "string" && paypalCode.length > 0
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

  const subtotalCents = activeLines.reduce(
    (s, l) => s + l.quantity * l.product.priceGrossCents,
    0,
  );
  const currency = activeLines[0]!.product.currency;
  const idempotencyKey = randomUUID();

  const summaryLines: CheckoutSummaryLine[] = activeLines.map((l) => ({
    id: l.id,
    quantity: l.quantity,
    product: {
      title: l.product.title,
      priceGrossCents: l.product.priceGrossCents,
      taxRatePercent: l.product.taxRatePercent,
      images: l.product.images,
    },
  }));

  const shopShip = await getShopShippingSettings();
  const allowedShippingCountries = shopShip.shippingCountryCodes.map((code) => ({
    code,
    label: labelForShippingCountryCode(code),
  }));
  if (!allowedShippingCountries.length) {
    redirect("/warenkorb?grund=versand_nicht_konfiguriert");
  }
  const initialShippingCountry = allowedShippingCountries[0]!.code;

  const prefillPaypal = sp.payment === "paypal";

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs
        items={[
          { href: "/", label: "Start" },
          { href: "/warenkorb", label: "Warenkorb" },
          { label: "Checkout" },
        ]}
      />
      {paypalError ? (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {paypalError}
        </div>
      ) : null}
      <div className="mt-4">
        <CheckoutForm
          idempotencyKey={idempotencyKey}
          lines={summaryLines}
          subtotalCents={subtotalCents}
          shippingRatesByCountry={shopShip.shippingRatesCentsByCountry}
          freeShippingFromSubtotalGrossCents={shopShip.freeShippingFromSubtotalGrossCents}
          initialShippingCountry={initialShippingCountry}
          currency={currency}
          allowedShippingCountries={allowedShippingCountries}
          payPalConfigured={isPayPalConfigured()}
          payPalClientId={process.env.PAYPAL_CLIENT_ID?.trim() ?? ""}
          prefillPaypal={prefillPaypal}
        />
      </div>
    </div>
  );
}
