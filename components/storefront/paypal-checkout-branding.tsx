import Image from "next/image";

/**
 * PayPal-Akzeptanzmarke (CDN von PayPal). Nur anzeigen, wenn PayPal als Zahlungsweg aktiv ist.
 * @see https://www.paypal.com/de/webapps/mpp/logo-center
 */
export function PayPalCheckoutWordmark({
  className,
  size = "default",
}: {
  className?: string;
  /** `compact`: kleinere Darstellung neben Smart Buttons. */
  size?: "default" | "compact";
}) {
  const sizeClass =
    size === "compact" ? "h-8 w-auto max-w-[5.25rem]" : "h-11 w-auto max-w-[6.5rem]";
  return (
    <Image
      alt="PayPal"
      src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg"
      width={111}
      height={69}
      className={`${sizeClass} shrink-0 object-contain object-left ${className ?? ""}`}
    />
  );
}
