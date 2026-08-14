/** Öffnet das Header-Login-Popover (Checkout-Kontakt, analog Cookie-Einstellungen). */
export const OPEN_STOREFRONT_LOGIN_EVENT = "jerrys:open-storefront-login";

export function openStorefrontLogin(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_STOREFRONT_LOGIN_EVENT));
}
