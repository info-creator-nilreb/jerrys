export const STOREFRONT_CART_UPDATED = "storefront:cart-updated";

export type StorefrontCartUpdatedDetail = {
  /** Stückzahl, die gerade hinzugefügt bzw. erhöht wurde. */
  quantityDelta: number;
};

export function notifyStorefrontCartUpdated(detail: StorefrontCartUpdatedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STOREFRONT_CART_UPDATED, { detail }));
}
