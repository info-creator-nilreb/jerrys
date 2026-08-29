import { createElement, type ReactNode } from "react";

/** Feste Höhe des Warenkorb-Bereichs in kompakten Produktkarten (Listing, Karussell, Kollektion). */
export const PRODUCT_CARD_COMPACT_ACTION_CLASS =
  "flex h-[8.25rem] flex-col justify-end sm:h-[4.625rem]";

/** Stretch-Hülle für ProductCard in Grid und Karussell (gleiche Kartenhöhe pro Zeile). */
export function ProductCardCell({ children }: { children: ReactNode }) {
  return createElement(
    "div",
    { className: "flex min-h-full w-full flex-1 flex-col self-stretch" },
    children,
  );
}
