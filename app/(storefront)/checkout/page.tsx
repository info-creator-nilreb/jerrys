import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import type { CheckoutSummaryLine } from "@/components/storefront/checkout-summary-aside";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines } from "@/lib/cart/cart-queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  const cartId = await getCartIdFromCookie();
  const cart = cartId ? await getCartWithLines(cartId) : null;
  const activeLines = cart?.lines.filter((l) => l.product.isActive) ?? [];

  if (!activeLines.length) {
    redirect("/warenkorb");
  }

  const subtotalCents = activeLines.reduce(
    (s, l) => s + l.quantity * l.product.priceGrossCents,
    0,
  );
  const currency = activeLines[0]!.product.currency;
  const idempotencyKey = randomUUID();

  const summaryLines: CheckoutSummaryLine[] = activeLines.map((l) => ({
    id: l.id,
    quantity: l.quantity,
    product: {
      title: l.product.title,
      priceGrossCents: l.product.priceGrossCents,
      taxRatePercent: l.product.taxRatePercent,
      images: l.product.images,
    },
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs
        items={[
          { href: "/", label: "Start" },
          { href: "/warenkorb", label: "Warenkorb" },
          { label: "Checkout" },
        ]}
      />
      <div className="mt-4">
        <CheckoutForm
          idempotencyKey={idempotencyKey}
          lines={summaryLines}
          subtotalCents={subtotalCents}
          shippingCents={0}
          currency={currency}
        />
      </div>
    </div>
  );
}
