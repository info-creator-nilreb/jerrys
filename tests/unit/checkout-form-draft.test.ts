import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  CHECKOUT_FORM_DRAFT_STORAGE_KEY,
  clearCheckoutFormDraft,
  loadCheckoutFormDraft,
  saveCheckoutFormDraft,
  type CheckoutFormDraft,
} from "@/lib/checkout/checkout-form-draft";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
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

  it("speichert und lädt Draft in sessionStorage", () => {
    saveCheckoutFormDraft(sampleDraft);
    expect(loadCheckoutFormDraft()).toEqual(sampleDraft);
  });

  it("löscht Draft", () => {
    saveCheckoutFormDraft(sampleDraft);
    clearCheckoutFormDraft();
    expect(loadCheckoutFormDraft()).toBeNull();
    expect(sessionStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY)).toBeNull();
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
});
