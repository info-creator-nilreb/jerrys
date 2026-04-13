import { ShoppingCart } from "lucide-react";

/** Warenkorb-Icon (Header, PDP-Button) — Lucide, Farbe über `currentColor`. */
export function CartIcon({ className }: { className?: string }) {
  return <ShoppingCart className={className} aria-hidden strokeWidth={1.5} />;
}
