"use client";

import { Minus, Plus } from "lucide-react";

/** Einheitliche eckige Mengenselektoren (Warenkorb, Flyout, PDP, Listing). */
export const quantityStepperButtonClassName =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-(--surface-muted) bg-white text-(--foreground-heading) transition-colors hover:border-primary hover:bg-(--surface-soft) hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 sm:size-10";

export const quantityStepperValueClassName =
  "min-w-[2.75rem] text-center text-sm font-medium tabular-nums text-(--foreground-heading) sm:min-w-[3rem] sm:text-base";

export function QuantityStepperButton({
  label,
  disabled,
  type = "submit",
  onClick,
  direction,
}: {
  label: string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  direction: "dec" | "inc";
}) {
  const Icon = direction === "dec" ? Minus : Plus;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={quantityStepperButtonClassName}
      aria-label={label}
    >
      <Icon className="size-4" aria-hidden strokeWidth={2} />
    </button>
  );
}

export function QuantityStepperValue({
  quantity,
  id,
}: {
  quantity: number;
  id?: string;
}) {
  return (
    <span id={id} className={quantityStepperValueClassName} aria-label={`Menge ${quantity}`}>
      {quantity}
    </span>
  );
}
