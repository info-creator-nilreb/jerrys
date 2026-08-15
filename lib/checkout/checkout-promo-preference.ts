export const CHECKOUT_PROMO_PREFERENCE_STORAGE_KEY = "jerrys_checkout_promo";

export type CheckoutPromoPreference = {
  v: 1;
  code: string;
  declineAutomatic: boolean;
};

export function saveCheckoutPromoPreference(pref: Omit<CheckoutPromoPreference, "v">): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: CheckoutPromoPreference = {
      v: 1,
      code: pref.code.trim().toUpperCase(),
      declineAutomatic: pref.declineAutomatic === true,
    };
    sessionStorage.setItem(CHECKOUT_PROMO_PREFERENCE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode
  }
}

export function loadCheckoutPromoPreference(): CheckoutPromoPreference | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_PROMO_PREFERENCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutPromoPreference>;
    if (parsed.v !== 1) return null;
    return {
      v: 1,
      code: typeof parsed.code === "string" ? parsed.code : "",
      declineAutomatic: parsed.declineAutomatic === true,
    };
  } catch {
    return null;
  }
}

export function clearCheckoutPromoPreference(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_PROMO_PREFERENCE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
