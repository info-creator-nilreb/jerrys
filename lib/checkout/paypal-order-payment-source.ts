import type { CheckoutFormInput } from "@/lib/checkout/schemas";
import {
  checkoutSurfaceNeedsHostedRedirect,
  parseCheckoutPayPalSurface,
  type CheckoutPayPalSurface,
} from "@/lib/checkout/checkout-paypal-surface";
import { paypalVaultCustomerId } from "@/lib/payments/paypal-vault-customer-id";
import { isPayPalSepaDebitEnabled } from "@/lib/payments/paypal-config";
import {
  createPayPalCheckoutOrder,
  PayPalOrderCreateError,
  preferredPayPalRedirectUrl,
  type PayPalCheckoutPaymentSource,
  type PayPalShippingPreference,
} from "@/lib/payments/paypal-orders";

/** Eurozone-Länder, für die PayPal SEPA Direct Debit anbietet. */
const SEPA_DIRECT_DEBIT_COUNTRIES = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
]);

export function isSepaDirectDebitCountry(countryCode: string): boolean {
  return SEPA_DIRECT_DEBIT_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export function paymentSourceForCheckoutForm(
  d: CheckoutFormInput,
  shopCustomerId: string | null,
): { ok: true; source: PayPalCheckoutPaymentSource | undefined } | { ok: false; error: string } {
  const surface: CheckoutPayPalSurface = parseCheckoutPayPalSurface(d.checkoutPayPalSurface);

  if (surface === "sepa") {
    if (!isPayPalSepaDebitEnabled()) {
      return {
        ok: false,
        error:
          "SEPA-Lastschrift ist für diesen Shop derzeit nicht verfügbar. Bitte PayPal oder Karte wählen.",
      };
    }
    const country = d.billingCountry.trim().toUpperCase();
    if (!isSepaDirectDebitCountry(country)) {
      return {
        ok: false,
        error:
          "SEPA-Lastschrift ist für dieses Rechnungsland nicht verfügbar. Bitte PayPal oder Karte wählen.",
      };
    }
    const name = `${d.billingFirstName} ${d.billingLastName}`.trim();
    if (!name || !d.email.trim()) {
      return { ok: false, error: "Für SEPA-Lastschrift fehlen Name oder E-Mail." };
    }
    const line2 = d.billingLine2?.trim();
    return {
      ok: true,
      source: {
        type: "sepa_debit",
        name,
        email: d.email.trim(),
        address: {
          address_line_1: d.billingLine1,
          ...(line2 ? { address_line_2: line2 } : {}),
          admin_area_2: d.billingCity,
          postal_code: d.billingZip,
          country_code: country,
        },
      },
    };
  }

  if (surface !== "card") {
    return { ok: true, source: undefined };
  }

  const vaultCustomerId = shopCustomerId ? paypalVaultCustomerId(shopCustomerId) : null;
  const vaultId = d.paypalVaultId?.trim();
  if (vaultId && vaultCustomerId) {
    return {
      ok: true,
      source: { type: "vaulted_card", vaultId, customerId: vaultCustomerId },
    };
  }

  if (vaultCustomerId) {
    return {
      ok: true,
      source: { type: "card_vault_on_success", customerId: vaultCustomerId },
    };
  }

  return { ok: true, source: undefined };
}

export async function startPayPalCheckoutOrderFromForm(args: {
  d: CheckoutFormInput;
  shopCustomerId: string | null;
  internalOrderId: string;
  orderNumber: string;
  totalGrossCents: number;
  currency: string;
  shippingPreference?: PayPalShippingPreference;
}): Promise<{ paypalOrderId: string; approvalUrl: string; payerActionUrl: string | null }> {
  const resolved = paymentSourceForCheckoutForm(args.d, args.shopCustomerId);
  if (!resolved.ok) {
    throw new PayPalOrderCreateError(resolved.error, resolved.error);
  }

  const surface = parseCheckoutPayPalSurface(args.d.checkoutPayPalSurface);
  const created = await createPayPalCheckoutOrder({
    internalOrderId: args.internalOrderId,
    orderNumber: args.orderNumber,
    totalGrossCents: args.totalGrossCents,
    currency: args.currency,
    shippingPreference: args.shippingPreference,
    paymentSource: resolved.source,
  });

  const approvalUrl = preferredPayPalRedirectUrl(created, surface);
  if (checkoutSurfaceNeedsHostedRedirect(surface) && !approvalUrl) {
    const msg =
      surface === "sepa"
        ? "SEPA-Lastschrift konnte nicht gestartet werden. Bitte PayPal oder Karte wählen."
        : "PayPal-Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.";
    throw new PayPalOrderCreateError(msg, msg);
  }

  return {
    paypalOrderId: created.paypalOrderId,
    approvalUrl,
    payerActionUrl: created.payerActionUrl,
  };
}

export function paypalOrderCreateUserMessage(err: unknown, surface: CheckoutPayPalSurface): string {
  if (err instanceof PayPalOrderCreateError && err.userMessage) return err.userMessage;
  if (surface === "sepa") {
    return "SEPA-Lastschrift konnte nicht gestartet werden. Bitte PayPal oder Karte wählen.";
  }
  return "Die Bestellung wurde angelegt, der Zahlungsstart ist fehlgeschlagen. Bitte mit derselben Bestellung erneut versuchen oder den Support kontaktieren.";
}
