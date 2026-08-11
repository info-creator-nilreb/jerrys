/**
 * INTERNETMARKE REST (DHL Developer Portal).
 * Base: https://api-eu.dhl.com/post/de/shipping/im/v1
 * Auth: POST /user (application/x-www-form-urlencoded)
 * Kauf: POST /app/shoppingcart/pdf?directCheckout=true
 * Retoure: POST /app/retoure
 */

import type { InternetmarkeVoucherLayout } from "@/features/fulfillment/application/shipping-label-port";

export const INTERNETMARKE_API_BASE_URL =
  "https://api-eu.dhl.com/post/de/shipping/im/v1";

export type InternetmarkeEnvConfig = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  productCode: number;
  productPriceCents: number;
  pageFormatId: number;
  voucherLayout: InternetmarkeVoucherLayout;
};

function readRequired(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

function readPositiveInt(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function isInternetmarkeConfigured(): boolean {
  return getInternetmarkeConfig() != null;
}

/**
 * Liest Credentials + Standardprodukt. Fehlt etwas → null (Adapter fällt auf not_configured).
 */
export function getInternetmarkeConfig(): InternetmarkeEnvConfig | null {
  const clientId = readRequired("INTERNETMARKE_CLIENT_ID");
  const clientSecret = readRequired("INTERNETMARKE_CLIENT_SECRET");
  const username = readRequired("INTERNETMARKE_USERNAME");
  const password = readRequired("INTERNETMARKE_PASSWORD");
  const productCode = readPositiveInt("INTERNETMARKE_PRODUCT_CODE");
  const productPriceCents = readPositiveInt("INTERNETMARKE_PRODUCT_PRICE_CENTS");
  if (
    !clientId ||
    !clientSecret ||
    !username ||
    !password ||
    productCode == null ||
    productPriceCents == null
  ) {
    return null;
  }

  const pageFormatId = readPositiveInt("INTERNETMARKE_PAGE_FORMAT_ID") ?? 1;
  const layoutRaw = (process.env.INTERNETMARKE_VOUCHER_LAYOUT?.trim() ||
    "ADDRESS_ZONE") as string;
  const voucherLayout: InternetmarkeVoucherLayout =
    layoutRaw === "FRANKING_ZONE" ? "FRANKING_ZONE" : "ADDRESS_ZONE";

  return {
    clientId,
    clientSecret,
    username,
    password,
    productCode,
    productPriceCents,
    pageFormatId,
    voucherLayout,
  };
}
