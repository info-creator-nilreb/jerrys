"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/catalog/format";
import { pdpStockDeliveryLine } from "@/lib/catalog/pdp-stock-delivery";
import {
  quantityRulesFromVariant,
  variantOptionLabel,
  type StorefrontVariantCommerce,
} from "@/lib/catalog/default-variant-storefront";
import { defaultAddQuantity } from "@/lib/cart/quantity";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { ProductExpressCheckout } from "@/components/storefront/product-express-checkout";
import { ProductPdpStickyAtcBar } from "@/components/storefront/product-pdp-sticky-atc-bar";

export const PDP_PURCHASE_SENTINEL_ID = "pdp-purchase-sentinel";

export function ProductPdpPurchasePanel({
  productId,
  productTitle,
  coverImageUrl,
  coverImageAlt,
  currency,
  listPriceGrossCents,
  deliveryTimeKeyFallback,
  payPalConfigured,
  paypalClientId,
  applePayStoreLabel,
  variants,
  returnPolicyText,
}: {
  productId: string;
  productTitle: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  currency: string;
  listPriceGrossCents: number | null;
  deliveryTimeKeyFallback: string | null;
  payPalConfigured: boolean;
  paypalClientId: string;
  applePayStoreLabel: string;
  variants: StorefrontVariantCommerce[];
  /** Shop-Einstellung; null = Zeile ausblenden. */
  returnPolicyText?: string | null;
}) {
  const initialId = variants.find((v) => v.isDefault)?.id ?? variants[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [selectedId, variants],
  );

  if (!selected) {
    return (
      <p className="mt-6 text-base text-(--foreground-muted)">Derzeit nicht bestellbar.</p>
    );
  }

  const qtyRules = quantityRulesFromVariant(selected);
  const expressQuantity = defaultAddQuantity(qtyRules);
  const canAdd = expressQuantity !== null;
  const hasStrikePrice =
    listPriceGrossCents != null && listPriceGrossCents > selected.priceGrossCents;
  const stockLine = pdpStockDeliveryLine({
    availableQuantity: selected.availableQuantity,
    deliveryTimeKey: selected.deliveryTimeKey ?? deliveryTimeKeyFallback,
  });
  const inStock = selected.availableQuantity > 0;
  const showPicker = variants.length > 1;
  const expressQty = expressQuantity ?? qtyRules.minOrderQty;
  const expressTotalEstimate = selected.priceGrossCents * expressQty;

  return (
    <>
      <div className="mt-5 space-y-5 border-t border-(--surface-muted) pt-5">
      <div id={PDP_PURCHASE_SENTINEL_ID} className="h-px w-full" aria-hidden />
      {showPicker ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-(--foreground-heading)">Auswahl</legend>
          <div className="flex flex-col gap-2">
            {variants.map((v) => {
              const id = `variant-${v.id}`;
              return (
                <label
                  key={v.id}
                  htmlFor={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                    selectedId === v.id
                      ? "border-primary bg-primary/5"
                      : "border-(--surface-muted) bg-white"
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name="pdp-variant"
                    className="mt-0.5 accent-primary"
                    checked={selectedId === v.id}
                    onChange={() => setSelectedId(v.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-(--foreground-heading)">
                      {variantOptionLabel(v)}
                    </span>
                    <span className="mt-0.5 block text-(--foreground-muted)">
                      <span className="font-mono text-[0.7rem] tracking-tight text-(--foreground-muted)">
                        SKU {v.sku}
                      </span>
                      {" · "}
                      {formatPrice(v.priceGrossCents, currency)}
                      {v.availableQuantity <= 0 ? " · derzeit nicht verfügbar" : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div>
        {hasStrikePrice ? (
          <p className="text-sm text-(--foreground-muted)">
            <span className="mr-2 line-through">{formatPrice(listPriceGrossCents!, currency)}</span>
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-(--foreground-muted)">
              UVP
            </span>
          </p>
        ) : null}
        <p className="text-2xl font-semibold tracking-tight text-primary md:text-[1.7rem]">
          {formatPrice(selected.priceGrossCents, currency)}
          <span className="text-base font-normal text-(--foreground-muted)">*</span>
        </p>
        <p className="mt-1 text-sm text-(--foreground-muted)">inkl. MwSt., zzgl. Versand</p>
      </div>

      <ul className="space-y-2.5 text-sm text-(--foreground-muted)">
        <li className="flex gap-2.5">
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${inStock ? "bg-primary" : "bg-(--foreground-muted)"}`}
            aria-hidden
          />
          <span className="leading-snug">{stockLine}</span>
        </li>
        {returnPolicyText ? (
          <li className="flex gap-2.5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden strokeWidth={1.5} />
            <span className="leading-snug">{returnPolicyText}</span>
          </li>
        ) : null}
      </ul>

      {canAdd ? (
        <AddToCartForm
          productId={productId}
          productVariantId={selected.id}
          canAdd
          quantityRules={qtyRules}
          showCartIcon
          layout="pdp"
        />
      ) : null}

      {canAdd ? (
        <ProductExpressCheckout
          enabled
          productId={productId}
          productVariantId={selected.id}
          quantity={expressQty}
          payPalConfigured={payPalConfigured}
          paypalClientId={paypalClientId}
          currency={currency}
          totalGrossCents={expressTotalEstimate}
          applePayStoreLabel={applePayStoreLabel}
        />
      ) : null}

      <p className="text-center text-[0.7rem] leading-snug text-(--foreground-muted)">
        Im Checkout:{" "}
        <span className="text-(--foreground-heading)">PayPal, Debit- oder Kreditkarte</span> und
        weitere sichere Zahlungsarten.
      </p>

      <p className="border-t border-(--surface-muted) pt-4 text-[0.68rem] leading-relaxed text-(--foreground-muted)">
        * inkl. MwSt., zzgl. Versand. Nach dem Warenkorb folgen Warenkorb und Checkout.
      </p>
    </div>

      <ProductPdpStickyAtcBar
        sentinelId={PDP_PURCHASE_SENTINEL_ID}
        productTitle={productTitle}
        imageUrl={coverImageUrl}
        imageAlt={coverImageAlt}
        priceFormatted={formatPrice(selected.priceGrossCents, currency)}
        productId={productId}
        productVariantId={selected.id}
        canAdd={canAdd}
        quantityRules={qtyRules}
      />
    </>
  );
}
