import type { CheckoutPayPalMethodId } from "@/components/storefront/checkout-payment-methods";
import type { CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import { parseCheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";

export const CHECKOUT_FORM_DRAFT_STORAGE_KEY = "jerrys_checkout_form_draft";

export type CheckoutFormDraftPerson = {
  firstName: string;
  lastName: string;
  company: string;
};

export type CheckoutFormDraftAddress = {
  zip: string;
  city: string;
  line1: string;
  line2: string;
};

export type CheckoutFormDraft = {
  v: 1;
  email: string;
  phone: string;
  deliveryMethod: CheckoutDeliveryMethod;
  shippingCountry: string;
  shippingPerson: CheckoutFormDraftPerson;
  shippingAddressValues: CheckoutFormDraftAddress;
  shippingAddressId: string;
  billingDifferent: boolean;
  billingCountry: string;
  billingPerson: CheckoutFormDraftPerson;
  billingAddressValues: CheckoutFormDraftAddress;
  billingAddressId: string;
  payPalSurface: CheckoutPayPalMethodId;
  committedPromoCode: string;
  declineAutomatic: boolean;
  rechtlicheKenntnis: boolean;
};

const EMPTY_PERSON: CheckoutFormDraftPerson = { firstName: "", lastName: "", company: "" };
const EMPTY_ADDRESS: CheckoutFormDraftAddress = { zip: "", city: "", line1: "", line2: "" };

const PAYPAL_SURFACE_IDS = new Set<string>(["paypal", "apple_pay", "google_pay", "sepa", "card"]);

function formString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function asPerson(raw: unknown): CheckoutFormDraftPerson {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PERSON };
  const o = raw as Record<string, unknown>;
  return {
    firstName: typeof o.firstName === "string" ? o.firstName : "",
    lastName: typeof o.lastName === "string" ? o.lastName : "",
    company: typeof o.company === "string" ? o.company : "",
  };
}

function asAddress(raw: unknown): CheckoutFormDraftAddress {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ADDRESS };
  const o = raw as Record<string, unknown>;
  return {
    zip: typeof o.zip === "string" ? o.zip : "",
    city: typeof o.city === "string" ? o.city : "",
    line1: typeof o.line1 === "string" ? o.line1 : "",
    line2: typeof o.line2 === "string" ? o.line2 : "",
  };
}

function asPayPalSurface(raw: unknown): CheckoutPayPalMethodId {
  return PAYPAL_SURFACE_IDS.has(String(raw)) ? (raw as CheckoutPayPalMethodId) : "paypal";
}

export function checkoutFormDraftFromForm(
  form: HTMLFormElement,
  extras: {
    deliveryMethod: CheckoutDeliveryMethod;
    shippingAddressId: string;
    billingDifferent: boolean;
    billingAddressId: string;
    payPalSurface: CheckoutPayPalMethodId;
    committedPromoCode: string;
    declineAutomatic: boolean;
  },
): CheckoutFormDraft {
  const fd = new FormData(form);
  return {
    v: 1,
    email: formString(fd, "email"),
    phone: formString(fd, "phone"),
    deliveryMethod: extras.deliveryMethod,
    shippingCountry: formString(fd, "shippingCountry") || "DE",
    shippingPerson: {
      firstName: formString(fd, "shippingFirstName"),
      lastName: formString(fd, "shippingLastName"),
      company: formString(fd, "shippingCompany"),
    },
    shippingAddressValues: {
      zip: formString(fd, "shippingZip"),
      city: formString(fd, "shippingCity"),
      line1: formString(fd, "shippingLine1"),
      line2: formString(fd, "shippingLine2"),
    },
    shippingAddressId: extras.shippingAddressId,
    billingDifferent: extras.billingDifferent,
    billingCountry: formString(fd, "billingCountry") || formString(fd, "shippingCountry") || "DE",
    billingPerson: {
      firstName: formString(fd, "billingFirstName"),
      lastName: formString(fd, "billingLastName"),
      company: formString(fd, "billingCompany"),
    },
    billingAddressValues: {
      zip: formString(fd, "billingZip"),
      city: formString(fd, "billingCity"),
      line1: formString(fd, "billingLine1"),
      line2: formString(fd, "billingLine2"),
    },
    billingAddressId: extras.billingAddressId,
    payPalSurface: extras.payPalSurface,
    committedPromoCode: extras.committedPromoCode,
    declineAutomatic: extras.declineAutomatic,
    rechtlicheKenntnis: formString(fd, "rechtlicheKenntnis") === "on",
  };
}

export function saveCheckoutFormDraft(draft: CheckoutFormDraft): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota / private mode — Checkout ohne Draft fortsetzen.
  }
}

export function loadCheckoutFormDraft(): CheckoutFormDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutFormDraft>;
    if (parsed.v !== 1) return null;
    if (typeof parsed.email !== "string") return null;
    return {
      v: 1,
      email: parsed.email,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      deliveryMethod: parseCheckoutDeliveryMethod(parsed.deliveryMethod),
      shippingCountry: typeof parsed.shippingCountry === "string" ? parsed.shippingCountry : "DE",
      shippingPerson: asPerson(parsed.shippingPerson),
      shippingAddressValues: asAddress(parsed.shippingAddressValues),
      shippingAddressId: typeof parsed.shippingAddressId === "string" ? parsed.shippingAddressId : "",
      billingDifferent: parsed.billingDifferent === true,
      billingCountry: typeof parsed.billingCountry === "string" ? parsed.billingCountry : "DE",
      billingPerson: asPerson(parsed.billingPerson),
      billingAddressValues: asAddress(parsed.billingAddressValues),
      billingAddressId: typeof parsed.billingAddressId === "string" ? parsed.billingAddressId : "",
      payPalSurface: asPayPalSurface(parsed.payPalSurface),
      committedPromoCode: typeof parsed.committedPromoCode === "string" ? parsed.committedPromoCode : "",
      declineAutomatic: parsed.declineAutomatic === true,
      rechtlicheKenntnis: parsed.rechtlicheKenntnis === true,
    };
  } catch {
    return null;
  }
}

export function clearCheckoutFormDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
