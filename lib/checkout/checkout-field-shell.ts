/**
 * Gleiche optische Shell wie die nativen Checkout-Felder (`checkout-form.tsx` formControlBase + vertikales Padding).
 * Für PayPal-Hosted-Felder: umschließt nur den iframe-Bereich.
 */
/** `block` statt `flex`: mehrere PayPal-Knoten im Host würden sonst nebeneinanderfließen (Doppel-Felder). */
export const CHECKOUT_FIELD_SHELL =
  "box-border block min-h-[44px] w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-[10px] text-sm leading-normal text-[#1f2937] outline-none ring-primary focus-within:border-primary focus-within:ring-1";
