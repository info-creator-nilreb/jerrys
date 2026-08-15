import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  CHECKOUT_FORM_DRAFT_COOKIE_NAME,
  CHECKOUT_FORM_DRAFT_STORAGE_KEY,
  checkoutFormDraftFromCheckoutInput,
  checkoutFormDraftFromOrderSnapshot,
  clearCheckoutFormDraft,
  decodeCheckoutFormDraftCookie,
  encodeCheckoutFormDraftCookie,
  loadCheckoutFormDraft,
  mergeCheckoutFormDraft,
  saveCheckoutFormDraft,
  type CheckoutFormDraft,
} from "@/lib/checkout/checkout-form-draft";
import { checkoutFormSchema } from "@/lib/checkout/schemas";

const sessionStore = new Map<string, string>();
const localStore = new Map<string, string>();
let cookieJar = "";

function storageStub(map: Map<string, string>) {
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

beforeEach(() => {
  sessionStore.clear();
  localStore.clear();
  cookieJar = "";
  vi.stubGlobal("sessionStorage", storageStub(sessionStore));
  vi.stubGlobal("localStorage", storageStub(localStore));
  vi.stubGlobal("window", { location: { protocol: "http:" } });
  vi.stubGlobal("document", {
    get cookie() {
      return cookieJar;
    },
    set cookie(value: string) {
      const [pair] = value.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const val = pair.slice(eq + 1);
      const parts = cookieJar.split("; ").filter((p) => p && !p.startsWith(`${name}=`));
      if (value.includes("Max-Age=0")) {
        cookieJar = parts.join("; ");
        return;
      }
      parts.push(`${name}=${val}`);
      cookieJar = parts.join("; ");
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleDraft: CheckoutFormDraft = {
  v: 1,
  email: "max@example.com",
  phone: "+49 30 123456",
  deliveryMethod: "shipping",
  shippingCountry: "DE",
  shippingPerson: { firstName: "Max", lastName: "Muster", company: "" },
  shippingAddressValues: {
    zip: "10115",
    city: "Berlin",
    line1: "Musterstraße 1",
    line2: "",
  },
  shippingAddressId: "",
  billingDifferent: false,
  billingCountry: "DE",
  billingPerson: { firstName: "Max", lastName: "Muster", company: "" },
  billingAddressValues: {
    zip: "10115",
    city: "Berlin",
    line1: "Musterstraße 1",
    line2: "",
  },
  billingAddressId: "",
  payPalSurface: "paypal",
  committedPromoCode: "",
  declineAutomatic: false,
  rechtlicheKenntnis: false,
};

describe("checkout form draft", () => {
  beforeEach(() => {
    clearCheckoutFormDraft();
  });

  afterEach(() => {
    clearCheckoutFormDraft();
  });

  it("speichert und lädt Draft in sessionStorage, localStorage und Cookie", () => {
    saveCheckoutFormDraft(sampleDraft);
    const loaded = loadCheckoutFormDraft();
    expect(loaded).toMatchObject(sampleDraft);
    expect(loaded?.savedAt).toEqual(expect.any(Number));
    expect(sessionStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(document.cookie).toContain(CHECKOUT_FORM_DRAFT_COOKIE_NAME);
  });

  it("lädt aus Cookie, wenn Web-Storage leer ist", () => {
    const encoded = encodeCheckoutFormDraftCookie({ ...sampleDraft, savedAt: Date.now() });
    document.cookie = `${CHECKOUT_FORM_DRAFT_COOKIE_NAME}=${encoded}`;
    expect(loadCheckoutFormDraft()).toMatchObject({ email: "max@example.com", shippingPerson: sampleDraft.shippingPerson });
  });

  it("löscht Draft", () => {
    saveCheckoutFormDraft(sampleDraft);
    clearCheckoutFormDraft();
    expect(loadCheckoutFormDraft()).toBeNull();
    expect(sessionStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("ignoriert ungültige Draft-Version", () => {
    sessionStorage.setItem(
      CHECKOUT_FORM_DRAFT_STORAGE_KEY,
      JSON.stringify({ v: 2, email: "a@b.de" }),
    );
    expect(loadCheckoutFormDraft()).toBeNull();
  });

  it("füllt fehlende rechtlicheKenntnis beim Laden", () => {
    sessionStorage.setItem(
      CHECKOUT_FORM_DRAFT_STORAGE_KEY,
      JSON.stringify({ ...sampleDraft, rechtlicheKenntnis: undefined }),
    );
    expect(loadCheckoutFormDraft()?.rechtlicheKenntnis).toBe(false);
  });

  it("baut Draft aus Checkout-Formularinput", () => {
    const d = checkoutFormSchema.parse({
      email: "kunde@example.com",
      shippingFirstName: "Erika",
      shippingLastName: "Muster",
      shippingLine1: "Invalidenstr. 12",
      shippingZip: "10115",
      shippingCity: "Berlin",
      shippingCountry: "DE",
      billingUseShipping: "yes",
      paymentMethod: "paypal",
      rechtlicheKenntnis: "on",
      idempotencyKey: randomUUID(),
      checkoutPayPalSurface: "paypal",
    });
    const draft = checkoutFormDraftFromCheckoutInput(d);
    expect(draft.email).toBe("kunde@example.com");
    expect(draft.shippingPerson.firstName).toBe("Erika");
    expect(draft.shippingAddressValues.line1).toBe("Invalidenstr. 12");
    expect(draft.billingDifferent).toBe(false);
    expect(draft.rechtlicheKenntnis).toBe(true);
  });

  it("baut Draft aus Bestell-Snapshot nach PayPal-Abbruch", () => {
    const draft = checkoutFormDraftFromOrderSnapshot({
      email: "kunde@example.com",
      phone: "+49 30 1",
      deliveryMethod: "pickup",
      shippingFirstName: "Erika",
      shippingLastName: "Muster",
      shippingCompany: null,
      shippingLine1: "Invalidenstr. 12",
      shippingLine2: null,
      shippingZip: "10115",
      shippingCity: "Berlin",
      shippingCountry: "DE",
      billingFirstName: "Firma",
      billingLastName: "GmbH",
      billingCompany: "Acme",
      billingLine1: "Rechnungsweg 1",
      billingLine2: null,
      billingZip: "20095",
      billingCity: "Hamburg",
      billingCountry: "DE",
      promotionCodeSnapshot: "SOMMER",
    });
    expect(draft.deliveryMethod).toBe("pickup");
    expect(draft.billingDifferent).toBe(true);
    expect(draft.billingPerson.company).toBe("Acme");
    expect(draft.committedPromoCode).toBe("SOMMER");
  });

  it("füllt leere Formularfelder aus dem React-State", () => {
    const emptyForm: CheckoutFormDraft = {
      ...sampleDraft,
      email: "",
      shippingAddressValues: { zip: "", city: "", line1: "", line2: "" },
    };
    const merged = mergeCheckoutFormDraft(emptyForm, sampleDraft);
    expect(merged.email).toBe("max@example.com");
    expect(merged.shippingAddressValues.line1).toBe("Musterstraße 1");
  });

  it("kodiert und dekodiert Cookie-Payload", () => {
    const encoded = encodeCheckoutFormDraftCookie(sampleDraft);
    expect(encoded).not.toContain("{");
    expect(decodeCheckoutFormDraftCookie(encoded)).toMatchObject({ email: sampleDraft.email });
  });
});
