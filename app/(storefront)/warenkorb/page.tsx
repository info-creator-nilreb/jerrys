import Link from "next/link";
import { CheckoutExpressPayPalOnly } from "@/components/storefront/checkout-express-paypal";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import {
  CartLineMobileCard,
  CartLineTableRow,
} from "@/components/storefront/cart-line-table-row";
import { PriceEUR } from "@/components/storefront/price-eur";
import { CartCustomerNoteForm } from "@/components/storefront/cart-customer-note-form";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { cartLineCommerceRules, getCartWithLines } from "@/lib/cart/cart-queries";
import { resolveCartPromotionTotals } from "@/lib/checkout/cart-promotion-totals";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { applePayStoreLabel } from "@/lib/shop/storefront-branding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dein Warenkorb",
};

export default async function WarenkorbPage({
  searchParams,
}: {
  searchParams: Promise<{ grund?: string }>;
}) {
  const { grund } = await searchParams;
  const paypalHinweis = grund === "paypal_nicht_konfiguriert";

  const cartId = await getCartIdFromCookie();
  const cart = cartId ? await getCartWithLines(cartId) : null;

  const lines = cart?.lines ?? [];
  const activeLines = lines.filter((l) => l.product.isActive);
  const subtotalCents = activeLines.reduce((sum, l) => {
    const commerce = cartLineCommerceRules(l);
    return sum + l.quantity * commerce.priceGrossCents;
  }, 0);
  const currency = activeLines[0]?.product.currency ?? "EUR";
  const hasCheckout = activeLines.length > 0;
  const expressQuote = hasCheckout
    ? await resolveCartPromotionTotals({
        shippingCountry: "DE",
        promotion: { promotionCode: "", declineAutomatic: false },
        deliveryMethod: "shipping",
      })
    : null;
  const expressTotals = expressQuote?.ok ? expressQuote.totals : null;
  const shopSettings = await getShopSettings();
  const walletStoreLabel = applePayStoreLabel(shopSettings);

  return (
    <div className="mx-auto max-w-5xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Warenkorb" }]} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[#1f2937] sm:text-3xl">
        Dein Warenkorb
      </h1>

      {paypalHinweis ? (
        <div
          className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Online-Zahlung (PayPal) ist derzeit nicht eingerichtet. Bitte wenden Sie sich an den Shop-Betreiber oder
          versuchen Sie es später erneut.
        </div>
      ) : null}

      {lines.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Dein Warenkorb ist leer.{" "}
          <Link href="/produkte" className="font-medium text-primary hover:underline">
            Zu den Produkten
          </Link>
        </p>
      ) : (
        <>
          {/* Mobil: Kartenliste mit sichtbarer Menge */}
          <ul className="mt-10 md:hidden">
            {lines.map((line) => (
              <CartLineMobileCard key={line.id} line={line} />
            ))}
          </ul>

          {/* Desktop: Tabelle */}
          <div className="mt-10 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="min-w-0" />
                <col className="w-[15%]" />
                <col className="w-[19%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th scope="col" className="pb-3 pr-4 text-[11px] font-medium tracking-wide text-[#9ca3af] uppercase">
                    Produkt
                  </th>
                  <th
                    scope="col"
                    className="min-w-[10rem] px-3 pb-3 text-right text-[11px] font-medium tracking-wide text-[#9ca3af] uppercase"
                  >
                    Preis
                  </th>
                  <th
                    scope="col"
                    className="min-w-[11.5rem] px-3 pb-3 text-center text-[11px] font-medium tracking-wide text-[#9ca3af] uppercase"
                  >
                    Menge
                  </th>
                  <th
                    scope="col"
                    className="min-w-[10rem] px-3 pb-3 pr-0 text-right text-[11px] font-medium tracking-wide text-[#9ca3af] uppercase"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <CartLineTableRow key={line.id} line={line} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 border-t border-[#e5e7eb] pt-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-x-10 lg:gap-y-4">
              <CartCustomerNoteForm defaultNote={cart?.customerNote ?? ""} />

              <div className="lg:col-start-2 lg:row-start-1 lg:self-start lg:text-right">
                <p className="text-base font-semibold text-[#1f2937]">
                  Zwischensumme{" "}
                  <PriceEUR cents={subtotalCents} className="inline font-semibold" /> {currency}
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">Inklusive MwSt., zzgl. Versandkosten</p>
              </div>

              <div className="flex flex-col justify-end gap-4 lg:col-start-2 lg:row-start-2 lg:min-h-0">
                {hasCheckout ? (
                  <Link
                    href="/checkout"
                    className="flex w-full items-center justify-center rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover)"
                  >
                    Zur Kasse
                  </Link>
                ) : null}
              </div>

              <div className="lg:col-start-2 lg:row-start-3 lg:text-right">
                <p className="text-center text-xs text-[#9ca3af] lg:text-right">Express Checkout</p>
                <div className="mt-3 flex flex-col gap-2 sm:items-end lg:items-end">
                  <CheckoutExpressPayPalOnly
                    payPalConfigured={isPayPalConfigured()}
                    paypalClientId={process.env.PAYPAL_CLIENT_ID?.trim() ?? ""}
                    currency={currency}
                    totalGrossCents={expressTotals?.totalCents ?? subtotalCents}
                    applePayStoreLabel={walletStoreLabel}
                    variant="cart"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
