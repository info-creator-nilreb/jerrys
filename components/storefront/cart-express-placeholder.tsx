/** Platzhalter wie Express Checkout (ohne echte Zahlungsanbindung). */
export function CartExpressPlaceholder() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        disabled
        className="rounded-md bg-[#5A31F4] px-4 py-3 text-sm font-semibold text-white/90 opacity-60"
      >
        shop Pay
      </button>
      <button
        type="button"
        disabled
        className="rounded-md bg-[#FFC439] px-4 py-3 text-sm font-semibold text-[#003087] opacity-60"
      >
        PayPal
      </button>
      <button
        type="button"
        disabled
        className="rounded-md bg-[#1f1f1f] px-4 py-3 text-sm font-semibold text-white opacity-60"
      >
        G Pay
      </button>
    </div>
  );
}
