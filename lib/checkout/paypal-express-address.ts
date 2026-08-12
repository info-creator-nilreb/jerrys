import type { PayPalOrderApiResponse } from "@/lib/payments/paypal-refunds";

export type ApplePayContactLike = {
  emailAddress?: unknown;
  phoneNumber?: unknown;
  givenName?: unknown;
  familyName?: unknown;
  organizationName?: unknown;
  addressLines?: unknown;
  locality?: unknown;
  postalCode?: unknown;
  countryCode?: unknown;
};

export type PayPalExpressCheckoutAddress = {
  email: string;
  phone: string | null;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany: string | null;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
  billingFirstName: string;
  billingLastName: string;
  billingCompany: string | null;
  billingLine1: string;
  billingLine2: string | null;
  billingZip: string;
  billingCity: string;
  billingCountry: string;
};

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

function nullable(v: unknown): string | null {
  const s = clean(v);
  return s.length > 0 ? s : null;
}

export function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const parts = clean(fullName).split(" ").filter(Boolean);
  if (parts.length === 0) return { firstName: "PayPal", lastName: "Kunde" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "Kunde" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}

function appleAddressLine(contact: ApplePayContactLike | null | undefined, index: number): string {
  const raw = contact?.addressLines;
  if (!Array.isArray(raw)) return "";
  return clean(raw[index]);
}

export function expressAddressFromPayPalOrder(
  order: PayPalOrderApiResponse,
  fallbackApplePayContact?: ApplePayContactLike | null,
): PayPalExpressCheckoutAddress | null {
  const payer = order.payer;
  const purchaseUnit = order.purchase_units?.[0];
  const shipping = purchaseUnit?.shipping;
  const paypalAddress = shipping?.address;

  const fullShippingName =
    clean(shipping?.name?.full_name) ||
    [clean(fallbackApplePayContact?.givenName), clean(fallbackApplePayContact?.familyName)]
      .filter(Boolean)
      .join(" ") ||
    [clean(payer?.name?.given_name), clean(payer?.name?.surname)].filter(Boolean).join(" ");
  const shippingName = splitPersonName(fullShippingName);

  const email = clean(payer?.email_address) || clean(fallbackApplePayContact?.emailAddress);
  const phone =
    nullable(payer?.phone?.phone_number?.national_number) ?? nullable(fallbackApplePayContact?.phoneNumber);

  const line1 = clean(paypalAddress?.address_line_1) || appleAddressLine(fallbackApplePayContact, 0);
  const line2 = clean(paypalAddress?.address_line_2) || appleAddressLine(fallbackApplePayContact, 1);
  const city = clean(paypalAddress?.admin_area_2) || clean(fallbackApplePayContact?.locality);
  const zip = clean(paypalAddress?.postal_code) || clean(fallbackApplePayContact?.postalCode);
  const country = (clean(paypalAddress?.country_code) || clean(fallbackApplePayContact?.countryCode)).toUpperCase();
  const company = nullable(fallbackApplePayContact?.organizationName);

  if (!email || !line1 || !city || !zip || country.length !== 2) {
    return null;
  }

  return {
    email,
    phone,
    shippingFirstName: shippingName.firstName,
    shippingLastName: shippingName.lastName,
    shippingCompany: company,
    shippingLine1: line1,
    shippingLine2: line2 || null,
    shippingZip: zip,
    shippingCity: city,
    shippingCountry: country,
    billingFirstName: shippingName.firstName,
    billingLastName: shippingName.lastName,
    billingCompany: company,
    billingLine1: line1,
    billingLine2: line2 || null,
    billingZip: zip,
    billingCity: city,
    billingCountry: country,
  };
}
