/**
 * INTERNETMARKE REST (DHL Developer Portal).
 * Base: https://api-eu.dhl.com/post/de/shipping/im/v1
 * Auth: POST /user (application/x-www-form-urlencoded)
 * Kauf: POST /app/shoppingcart/pdf?directCheckout=true
 * Retoure: POST /app/retoure
 *
 * Credentials: bevorzugt Admin-DB (verschlüsselt), Fallback Env.
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
  source?: "db" | "env";
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

/** Nur Env — für Tests und Fallback. */
export function getInternetmarkeConfigFromEnv(): InternetmarkeEnvConfig | null {
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
    source: "env",
  };
}

/**
 * @deprecated Nutze `resolveInternetmarkeConfig()` (DB + Env).
 * Sync-Env-Fallback für bestehende Sync-Aufrufe/Tests.
 */
export function getInternetmarkeConfig(): InternetmarkeEnvConfig | null {
  return getInternetmarkeConfigFromEnv();
}

export function isInternetmarkeConfiguredFromEnv(): boolean {
  return getInternetmarkeConfigFromEnv() != null;
}

/** Async: DB zuerst, dann Env. */
export async function resolveInternetmarkeConfig(): Promise<InternetmarkeEnvConfig | null> {
  try {
    const { getInternetmarkeConfigFromDb } = await import(
      "@/features/fulfillment/infrastructure/internetmarke-connection"
    );
    const fromDb = await getInternetmarkeConfigFromDb();
    if (fromDb) return { ...fromDb, source: "db" };
  } catch {
    // DB/Schema nicht verfügbar (z. B. Unit-Tests) → Env-Fallback
  }
  return getInternetmarkeConfigFromEnv();
}

export async function isInternetmarkeConfigured(): Promise<boolean> {
  return (await resolveInternetmarkeConfig()) != null;
}
