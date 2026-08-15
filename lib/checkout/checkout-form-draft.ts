import type { CheckoutPayPalMethodId } from "@/components/storefront/checkout-payment-methods";
import type { CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import { parseCheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import { parseCheckoutPayPalSurface } from "@/lib/checkout/checkout-paypal-surface";
import type { CheckoutFormInput } from "@/lib/checkout/schemas";

export const CHECKOUT_FORM_DRAFT_STORAGE_KEY = "jerrys_checkout_form_draft";
export const CHECKOUT_FORM_DRAFT_COOKIE_NAME = "jerrys_checkout_form_draft";
export const CHECKOUT_FORM_DRAFT_MAX_AGE_SEC = 60 * 60 * 24 * 7;
const CHECKOUT_FORM_DRAFT_MAX_AGE_MS = CHECKOUT_FORM_DRAFT_MAX_AGE_SEC * 1000;

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
  savedAt?: number;
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

/** Felder einer Bestellung, aus denen sich der Checkout-Draft wiederherstellen lässt. */
export type CheckoutFormDraftOrderSnapshot = {
  email: string;
  phone: string | null;
  deliveryMethod: string;
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
  promotionCodeSnapshot: string | null;
};

const EMPTY_PERSON: CheckoutFormDraftPerson = { firstName: "", lastName: "", company: "" };
const EMPTY_ADDRESS: CheckoutFormDraftAddress = { zip: "", city: "", line1: "", line2: "" };

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

function pickFilled(primary: string, fallback: string): string {
  return primary.trim() ? primary : fallback;
}

function addressesDiffer(a: CheckoutFormDraftAddress, b: CheckoutFormDraftAddress, countryA: string, countryB: string): boolean {
  return (
    a.zip !== b.zip ||
    a.city !== b.city ||
    a.line1 !== b.line1 ||
    a.line2 !== b.line2 ||
    countryA !== countryB
  );
}

function personsDiffer(a: CheckoutFormDraftPerson, b: CheckoutFormDraftPerson): boolean {
  return a.firstName !== b.firstName || a.lastName !== b.lastName || a.company !== b.company;
}

export function parseCheckoutFormDraft(raw: string | null | undefined): CheckoutFormDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutFormDraft>;
    if (parsed.v !== 1) return null;
    if (typeof parsed.email !== "string") return null;
    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : undefined;
    if (savedAt != null && Date.now() - savedAt > CHECKOUT_FORM_DRAFT_MAX_AGE_MS) return null;
    return {
      v: 1,
      savedAt,
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
      payPalSurface: parseCheckoutPayPalSurface(parsed.payPalSurface),
      committedPromoCode: typeof parsed.committedPromoCode === "string" ? parsed.committedPromoCode : "",
      declineAutomatic: parsed.declineAutomatic === true,
      rechtlicheKenntnis: parsed.rechtlicheKenntnis === true,
    };
  } catch {
    return null;
  }
}

export function encodeCheckoutFormDraftCookie(draft: CheckoutFormDraft): string {
  return encodeURIComponent(JSON.stringify(draft));
}

export function decodeCheckoutFormDraftCookie(raw: string | undefined | null): CheckoutFormDraft | null {
  if (!raw) return null;
  try {
    return parseCheckoutFormDraft(decodeURIComponent(raw));
  } catch {
    return parseCheckoutFormDraft(raw);
  }
}

export function checkoutFormDraftCookieOptions(): {
  httpOnly: false;
  path: "/";
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    httpOnly: false,
    path: "/",
    maxAge: CHECKOUT_FORM_DRAFT_MAX_AGE_SEC,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

function readDocumentCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

function writeDocumentCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function clearDocumentCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function writeWebStorage(storage: Storage | undefined, raw: string): void {
  if (!storage) return;
  try {
    storage.setItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY, raw);
  } catch {
    // Quota / private mode
  }
}

function readWebStorage(storage: Storage | undefined): CheckoutFormDraft | null {
  if (!storage) return null;
  try {
    return parseCheckoutFormDraft(storage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function newestDraft(candidates: Array<CheckoutFormDraft | null>): CheckoutFormDraft | null {
  let best: CheckoutFormDraft | null = null;
  for (const c of candidates) {
    if (!c) continue;
    if (!best) {
      best = c;
      continue;
    }
    if ((c.savedAt ?? 0) >= (best.savedAt ?? 0)) best = c;
  }
  return best;
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

export function checkoutFormDraftFromCheckoutInput(d: CheckoutFormInput): CheckoutFormDraft {
  const shippingPerson: CheckoutFormDraftPerson = {
    firstName: d.shippingFirstName,
    lastName: d.shippingLastName,
    company: d.shippingCompany ?? "",
  };
  const shippingAddressValues: CheckoutFormDraftAddress = {
    zip: d.shippingZip,
    city: d.shippingCity,
    line1: d.shippingLine1,
    line2: d.shippingLine2 ?? "",
  };
  const billingPerson: CheckoutFormDraftPerson = {
    firstName: d.billingFirstName,
    lastName: d.billingLastName,
    company: d.billingCompany ?? "",
  };
  const billingAddressValues: CheckoutFormDraftAddress = {
    zip: d.billingZip,
    city: d.billingCity,
    line1: d.billingLine1,
    line2: d.billingLine2 ?? "",
  };
  const billingDifferent =
    personsDiffer(shippingPerson, billingPerson) ||
    addressesDiffer(shippingAddressValues, billingAddressValues, d.shippingCountry, d.billingCountry);
  return {
    v: 1,
    email: d.email,
    phone: d.phone ?? "",
    deliveryMethod: parseCheckoutDeliveryMethod(d.deliveryMethod),
    shippingCountry: d.shippingCountry,
    shippingPerson,
    shippingAddressValues,
    shippingAddressId: "",
    billingDifferent,
    billingCountry: d.billingCountry,
    billingPerson,
    billingAddressValues,
    billingAddressId: "",
    payPalSurface: parseCheckoutPayPalSurface(d.checkoutPayPalSurface),
    committedPromoCode: d.checkoutPromotionCode ?? "",
    declineAutomatic: d.checkoutDeclineAutomatic === true,
    rechtlicheKenntnis: true,
  };
}

export function checkoutFormDraftFromOrderSnapshot(order: CheckoutFormDraftOrderSnapshot): CheckoutFormDraft {
  const shippingPerson: CheckoutFormDraftPerson = {
    firstName: order.shippingFirstName,
    lastName: order.shippingLastName,
    company: order.shippingCompany ?? "",
  };
  const shippingAddressValues: CheckoutFormDraftAddress = {
    zip: order.shippingZip,
    city: order.shippingCity,
    line1: order.shippingLine1,
    line2: order.shippingLine2 ?? "",
  };
  const billingPerson: CheckoutFormDraftPerson = {
    firstName: order.billingFirstName,
    lastName: order.billingLastName,
    company: order.billingCompany ?? "",
  };
  const billingAddressValues: CheckoutFormDraftAddress = {
    zip: order.billingZip,
    city: order.billingCity,
    line1: order.billingLine1,
    line2: order.billingLine2 ?? "",
  };
  const billingDifferent =
    personsDiffer(shippingPerson, billingPerson) ||
    addressesDiffer(
      shippingAddressValues,
      billingAddressValues,
      order.shippingCountry,
      order.billingCountry,
    );
  return {
    v: 1,
    email: order.email,
    phone: order.phone ?? "",
    deliveryMethod: parseCheckoutDeliveryMethod(order.deliveryMethod),
    shippingCountry: order.shippingCountry,
    shippingPerson,
    shippingAddressValues,
    shippingAddressId: "",
    billingDifferent,
    billingCountry: order.billingCountry,
    billingPerson,
    billingAddressValues,
    billingAddressId: "",
    payPalSurface: "paypal",
    committedPromoCode: order.promotionCodeSnapshot ?? "",
    declineAutomatic: false,
    rechtlicheKenntnis: true,
  };
}

/** Formularwerte gewinnen, leere Felder fallen auf den React-State zurück. */
export function mergeCheckoutFormDraft(
  primary: CheckoutFormDraft,
  fallback: CheckoutFormDraft,
): CheckoutFormDraft {
  return {
    v: 1,
    email: pickFilled(primary.email, fallback.email),
    phone: pickFilled(primary.phone, fallback.phone),
    deliveryMethod: primary.deliveryMethod || fallback.deliveryMethod,
    shippingCountry: pickFilled(primary.shippingCountry, fallback.shippingCountry),
    shippingPerson: {
      firstName: pickFilled(primary.shippingPerson.firstName, fallback.shippingPerson.firstName),
      lastName: pickFilled(primary.shippingPerson.lastName, fallback.shippingPerson.lastName),
      company: pickFilled(primary.shippingPerson.company, fallback.shippingPerson.company),
    },
    shippingAddressValues: {
      zip: pickFilled(primary.shippingAddressValues.zip, fallback.shippingAddressValues.zip),
      city: pickFilled(primary.shippingAddressValues.city, fallback.shippingAddressValues.city),
      line1: pickFilled(primary.shippingAddressValues.line1, fallback.shippingAddressValues.line1),
      line2: pickFilled(primary.shippingAddressValues.line2, fallback.shippingAddressValues.line2),
    },
    shippingAddressId: pickFilled(primary.shippingAddressId, fallback.shippingAddressId),
    billingDifferent: primary.billingDifferent,
    billingCountry: pickFilled(primary.billingCountry, fallback.billingCountry),
    billingPerson: {
      firstName: pickFilled(primary.billingPerson.firstName, fallback.billingPerson.firstName),
      lastName: pickFilled(primary.billingPerson.lastName, fallback.billingPerson.lastName),
      company: pickFilled(primary.billingPerson.company, fallback.billingPerson.company),
    },
    billingAddressValues: {
      zip: pickFilled(primary.billingAddressValues.zip, fallback.billingAddressValues.zip),
      city: pickFilled(primary.billingAddressValues.city, fallback.billingAddressValues.city),
      line1: pickFilled(primary.billingAddressValues.line1, fallback.billingAddressValues.line1),
      line2: pickFilled(primary.billingAddressValues.line2, fallback.billingAddressValues.line2),
    },
    billingAddressId: pickFilled(primary.billingAddressId, fallback.billingAddressId),
    payPalSurface: primary.payPalSurface || fallback.payPalSurface,
    committedPromoCode: pickFilled(primary.committedPromoCode, fallback.committedPromoCode),
    declineAutomatic: primary.declineAutomatic,
    rechtlicheKenntnis: primary.rechtlicheKenntnis || fallback.rechtlicheKenntnis,
  };
}

export function saveCheckoutFormDraft(draft: CheckoutFormDraft): void {
  const payload: CheckoutFormDraft = { ...draft, v: 1, savedAt: Date.now() };
  const raw = JSON.stringify(payload);
  writeWebStorage(typeof sessionStorage === "undefined" ? undefined : sessionStorage, raw);
  writeWebStorage(typeof localStorage === "undefined" ? undefined : localStorage, raw);
  try {
    writeDocumentCookie(
      CHECKOUT_FORM_DRAFT_COOKIE_NAME,
      encodeCheckoutFormDraftCookie(payload),
      CHECKOUT_FORM_DRAFT_MAX_AGE_SEC,
    );
  } catch {
    // ignore
  }
}

export function loadCheckoutFormDraft(): CheckoutFormDraft | null {
  const fromSession = readWebStorage(typeof sessionStorage === "undefined" ? undefined : sessionStorage);
  const fromLocal = readWebStorage(typeof localStorage === "undefined" ? undefined : localStorage);
  const fromCookie = decodeCheckoutFormDraftCookie(readDocumentCookie(CHECKOUT_FORM_DRAFT_COOKIE_NAME));
  return newestDraft([fromSession, fromLocal, fromCookie]);
}

export function clearCheckoutFormDraft(): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    clearDocumentCookie(CHECKOUT_FORM_DRAFT_COOKIE_NAME);
  } catch {
    // ignore
  }
}
