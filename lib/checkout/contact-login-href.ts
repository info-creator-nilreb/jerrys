/**
 * Gast-Login im Checkout: öffnet das bestehende Header-Popover auf derselben Seite.
 * Ohne `callbackUrl`, damit `stayOnPage` greift und Prefill nach `router.refresh()` kommt.
 */
export function checkoutContactLoginHref(
  checkoutPath: "/checkout" | "/checkout/termine",
): string {
  return `${checkoutPath}?konto=anmelden`;
}
