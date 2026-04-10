/** Preis wie in Shopify-Referenz: Euro, Komma, Cent hochgestellt. */
export function PriceEUR({ cents, className = "" }: { cents: number; className?: string }) {
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  const wholeStr = whole.toLocaleString("de-DE");
  return (
    <span className={`tabular-nums ${className}`.trim()}>
      €&nbsp;{wholeStr},<sup className="align-super text-[0.72em] font-normal leading-none">{frac}</sup>
    </span>
  );
}
