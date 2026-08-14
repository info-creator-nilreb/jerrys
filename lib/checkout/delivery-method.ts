export const CHECKOUT_DELIVERY_METHODS = ["shipping", "pickup"] as const;

export type CheckoutDeliveryMethod = (typeof CHECKOUT_DELIVERY_METHODS)[number];

export function parseCheckoutDeliveryMethod(value: unknown): CheckoutDeliveryMethod {
  return value === "pickup" ? "pickup" : "shipping";
}

export function isPickupDeliveryMethod(value: string | null | undefined): boolean {
  return value === "pickup";
}

export function deliveryMethodLabel(value: string | null | undefined): string {
  return value === "pickup" ? "Abholung" : "Versand";
}
