/**
 * Shopify-like Checkout: schmale Formularspalte, Felder/Zahlung/CTA gleich breit.
 * `max-w-xl` (~576px) — nicht volle Grid-Spalte, damit lange Inputs nicht überbreit wirken.
 */
export const CHECKOUT_FORM_COLUMN_CLASS = "w-full max-w-xl";

/** Bestellübersicht rechts — abgesetzte Fläche wie Shopify Checkout. */
export const CHECKOUT_SUMMARY_PANEL_CLASS =
  "bg-(--surface-subtle) lg:min-h-[calc(100dvh-5.5rem)]";

/** Inhalt in der Summary-Spalte: schmaler als die graue Fläche (~⅓ der Formularspalte). */
export const CHECKOUT_SUMMARY_CONTENT_CLASS = "w-full max-w-[16rem] lg:max-w-[12rem]";
