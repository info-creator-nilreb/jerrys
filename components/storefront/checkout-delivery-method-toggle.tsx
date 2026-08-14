"use client";

import type { CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";

export function CheckoutDeliveryMethodToggle({
  value,
  onChange,
}: {
  value: CheckoutDeliveryMethod;
  onChange: (next: CheckoutDeliveryMethod) => void;
}) {
  const optionClass = (selected: boolean) =>
    selected
      ? "rounded-md bg-[#f3f4f6] px-4 py-3 text-center text-sm font-medium text-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      : "rounded-md px-4 py-3 text-center text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <>
      <div
        className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-[#e5e7eb] p-1"
        role="group"
        aria-label="Lieferart"
      >
        <button
          type="button"
          aria-pressed={value === "shipping"}
          className={optionClass(value === "shipping")}
          onClick={() => onChange("shipping")}
        >
          Versand
        </button>
        <button
          type="button"
          aria-pressed={value === "pickup"}
          className={optionClass(value === "pickup")}
          onClick={() => onChange("pickup")}
        >
          Abholung
        </button>
      </div>
      <input type="hidden" name="deliveryMethod" value={value} />
      {value === "pickup" ? (
        <p className="mt-3 text-sm text-[#6b7280]">
          Abholung vor Ort — keine Versandkosten. Bitte Adresse für Rechnung und Identifikation
          angeben.
        </p>
      ) : null}
    </>
  );
}
