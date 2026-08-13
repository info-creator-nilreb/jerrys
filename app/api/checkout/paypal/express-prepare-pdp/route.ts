import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureCartIdAndCookie } from "@/lib/cart/cart-cookie";
import { clampToValidQuantity, isValidCartQuantity } from "@/lib/cart/quantity";
import { getPrisma } from "@/lib/db/prisma";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

const bodySchema = z.object({
  productId: z.string().trim().min(1),
  productVariantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
});

/**
 * Shopify-ähnlicher PDP-Express: Warenkorb auf die gewählte Variante setzen,
 * danach kann express-create die Pending-Order bauen.
 */
export async function POST(req: NextRequest) {
  const limited = touchPayPalCheckoutApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen." },
      { status: 429, headers: payPalApiRateLimitJsonHeaders(limited.retryAfterSec) },
    );
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json({ ok: false, error: "PayPal ist nicht konfiguriert." }, { status: 503 });
  }

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ungültige Express-Angaben." }, { status: 400 });
  }

  const { productId, productVariantId, quantity } = parsed.data;
  const prisma = getPrisma();

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, currency: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: "Produkt nicht verfügbar." }, { status: 400 });
  }

  const variant = await prisma.productVariant.findFirst({
    where: {
      id: productVariantId,
      productId: product.id,
      isActive: true,
    },
    select: {
      id: true,
      priceGrossCents: true,
      taxRatePercent: true,
      availableQuantity: true,
      minOrderQty: true,
      purchaseStep: true,
      maxOrderQty: true,
    },
  });
  if (!variant) {
    return NextResponse.json({ ok: false, error: "Variante nicht verfügbar." }, { status: 400 });
  }

  const rules = {
    availableQuantity: variant.availableQuantity,
    minOrderQty: variant.minOrderQty,
    purchaseStep: variant.purchaseStep,
    maxOrderQty: variant.maxOrderQty,
  };
  const qty = clampToValidQuantity(rules, quantity);
  if (qty === null || !isValidCartQuantity(rules, qty)) {
    return NextResponse.json(
      { ok: false, error: "Diese Menge ist nicht möglich (Lager oder Staffelung)." },
      { status: 400 },
    );
  }

  const cartId = await ensureCartIdAndCookie();

  await prisma.$transaction(async (tx) => {
    await tx.cartLine.deleteMany({ where: { cartId } });
    await tx.cartLine.create({
      data: {
        cartId,
        productId: product.id,
        productVariantId: variant.id,
        quantity: qty,
      },
    });
  });

  const shipping = await getShopShippingSettings();
  const totals = computeCheckoutOrderTotalsWithDiscount({
    lines: [
      {
        quantity: qty,
        priceGrossCents: variant.priceGrossCents,
        taxRatePercent: variant.taxRatePercent,
      },
    ],
    shippingCountryCode: "DE",
    shippingRatesCentsByCountry: shipping.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shipping.freeShippingFromSubtotalGrossCents,
    discountOffSubtotalCents: 0,
  });

  return NextResponse.json({
    ok: true,
    currency: product.currency,
    totalGrossCents: totals.totalCents,
    quantity: qty,
  });
}
