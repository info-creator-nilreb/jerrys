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

/** App-Credentials aus Env (Developer Portal) — analog Instagram App ID/Secret. */
export function getInternetmarkeAppCredentialsFromEnv(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = readRequired("INTERNETMARKE_CLIENT_ID");
  const clientSecret = readRequired("INTERNETMARKE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isInternetmarkeAppConfiguredFromEnv(): boolean {
  return getInternetmarkeAppCredentialsFromEnv() != null;
}

function maskClientId(id: string): string {
  const t = id.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export function getInternetmarkeAppCredentialsPublic(): {
  configured: boolean;
  clientIdMasked: string | null;
} {
  const app = getInternetmarkeAppCredentialsFromEnv();
  if (!app) return { configured: false, clientIdMasked: null };
  return { configured: true, clientIdMasked: maskClientId(app.clientId) };
}

/** Volle Config nur aus Env (inkl. Portokasse) — Legacy-/Test-Fallback. */
export function getInternetmarkeConfigFromEnv(): InternetmarkeEnvConfig | null {
  const app = getInternetmarkeAppCredentialsFromEnv();
  const username = readRequired("INTERNETMARKE_USERNAME");
  const password = readRequired("INTERNETMARKE_PASSWORD");
  const productCode = readPositiveInt("INTERNETMARKE_PRODUCT_CODE");
  const productPriceCents = readPositiveInt("INTERNETMARKE_PRODUCT_PRICE_CENTS");
  if (
    !app ||
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
    clientId: app.clientId,
    clientSecret: app.clientSecret,
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
