"use client";

import type { CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";

export function CheckoutDeliveryMethodToggle({
  value,
  onChange,
  pickupAvailable = true,
}: {
  value: CheckoutDeliveryMethod;
  onChange: (next: CheckoutDeliveryMethod) => void;
  /** false = nur Versand (Warenkorb enthält nicht-abholbare Artikel). */
  pickupAvailable?: boolean;
}) {
  const optionClass = (selected: boolean) =>
    selected
      ? "rounded-md bg-[#f3f4f6] px-4 py-3 text-center text-sm font-medium text-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      : "rounded-md px-4 py-3 text-center text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  if (!pickupAvailable) {
    return (
      <>
        <input type="hidden" name="deliveryMethod" value="shipping" />
        <p className="mt-4 text-sm text-[#6b7280]">
          Für mindestens einen Artikel im Warenkorb ist nur Versand möglich.
        </p>
      </>
    );
  }

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
