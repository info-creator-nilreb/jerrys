import "server-only";

import type { InternetmarkeVoucherLayout } from "@/features/fulfillment/application/shipping-label-port";
import {
  getInternetmarkeAppCredentialsFromEnv,
  type InternetmarkeEnvConfig,
} from "@/features/fulfillment/infrastructure/internetmarke-config";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

export const INTERNETMARKE_CONNECTION_ID = "default" as const;

export type InternetmarkeConnectionPublic = {
  connected: boolean;
  /** Token-Test erfolgreich (lastVerifiedAt gesetzt, kein lastError). */
  verified: boolean;
  /** Env INTERNETMARKE_CLIENT_ID/_SECRET gesetzt. */
  appCredentialsConfigured: boolean;
  clientIdMasked: string | null;
  username: string | null;
  productCode: number | null;
  productPriceCents: number | null;
  productNameSnapshot: string | null;
  pageFormatId: number;
  voucherLayout: InternetmarkeVoucherLayout;
  connectedAt: Date | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  /** true wenn App-Env + verifizierte Portokasse + gewähltes Produkt vorhanden. */
  readyForPurchase: boolean;
};

function maskClientId(id: string): string {
  const t = id.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function asLayout(raw: string | null | undefined): InternetmarkeVoucherLayout {
  return raw === "FRANKING_ZONE" ? "FRANKING_ZONE" : "ADDRESS_ZONE";
}

export async function getInternetmarkeConnectionPublic(): Promise<InternetmarkeConnectionPublic> {
  const app = getInternetmarkeAppCredentialsFromEnv();
  const empty: InternetmarkeConnectionPublic = {
    connected: false,
    verified: false,
    appCredentialsConfigured: app != null,
    clientIdMasked: app ? maskClientId(app.clientId) : null,
    username: null,
    productCode: null,
    productPriceCents: null,
    productNameSnapshot: null,
    pageFormatId: 1,
    voucherLayout: "ADDRESS_ZONE",
    connectedAt: null,
    lastVerifiedAt: null,
    lastError: null,
    readyForPurchase: false,
  };
  try {
    const row = await getPrisma().internetmarkeConnection.findUnique({
      where: { id: INTERNETMARKE_CONNECTION_ID },
    });
    if (!row) return empty;
    const productCode = row.productCode;
    const productPriceCents = row.productPriceCents;
    const clientIdMasked = app
      ? maskClientId(app.clientId)
      : maskClientId(row.clientId);
    const verified = row.lastVerifiedAt != null && !row.lastError;
    return {
      connected: true,
      verified,
      appCredentialsConfigured: app != null,
      clientIdMasked,
      username: row.username,
      productCode,
      productPriceCents,
      productNameSnapshot: row.productNameSnapshot,
      pageFormatId: row.pageFormatId,
      voucherLayout: asLayout(row.voucherLayout),
      connectedAt: row.connectedAt,
      lastVerifiedAt: row.lastVerifiedAt,
      lastError: row.lastError,
      readyForPurchase:
        app != null &&
        verified &&
        productCode != null &&
        productCode > 0 &&
        productPriceCents != null &&
        productPriceCents > 0,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return empty;
    throw e;
  }
}

/**
 * Portokasse aus DB + App-Credentials bevorzugt aus Env.
 * Client-ID/Secret aus Env überschreiben DB-Kopien (Env ist Quelle der Wahrheit).
 */
export async function getInternetmarkeConnectionSecrets(): Promise<{
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  productCode: number | null;
  productPriceCents: number | null;
  pageFormatId: number;
  voucherLayout: InternetmarkeVoucherLayout;
} | null> {
  try {
    const row = await getPrisma().internetmarkeConnection.findUnique({
      where: { id: INTERNETMARKE_CONNECTION_ID },
    });
    if (!row) return null;
    const app = getInternetmarkeAppCredentialsFromEnv();
    return {
      clientId: app?.clientId ?? row.clientId,
      clientSecret: app?.clientSecret ?? decryptSecret(row.clientSecretEnc),
      username: row.username,
      password: decryptSecret(row.passwordEnc),
      productCode: row.productCode,
      productPriceCents: row.productPriceCents,
      pageFormatId: row.pageFormatId,
      voucherLayout: asLayout(row.voucherLayout),
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export async function getInternetmarkeConfigFromDb(): Promise<InternetmarkeEnvConfig | null> {
  const secrets = await getInternetmarkeConnectionSecrets();
  if (!secrets) return null;
  if (
    secrets.productCode == null ||
    secrets.productCode <= 0 ||
    secrets.productPriceCents == null ||
    secrets.productPriceCents <= 0
  ) {
    return null;
  }
  return {
    clientId: secrets.clientId,
    clientSecret: secrets.clientSecret,
    username: secrets.username,
    password: secrets.password,
    productCode: secrets.productCode,
    productPriceCents: secrets.productPriceCents,
    pageFormatId: secrets.pageFormatId,
    voucherLayout: secrets.voucherLayout,
  };
}

/**
 * Speichert Portokasse-Login. API Key/Secret kommen aus Env und werden mitgespiegelt.
 */
export async function saveInternetmarkePortokasseConnection(input: {
  username: string;
  password: string;
  /** Leer lassen beim Update = bestehendes Passwort behalten. */
  keepExistingPassword?: boolean;
}): Promise<void> {
  const app = getInternetmarkeAppCredentialsFromEnv();
  if (!app) {
    throw new Error(
      "INTERNETMARKE_CLIENT_ID und INTERNETMARKE_CLIENT_SECRET müssen in der Env (Vercel / .env.local) stehen.",
    );
  }

  const prisma = getPrisma();
  const existing = await prisma.internetmarkeConnection.findUnique({
    where: { id: INTERNETMARKE_CONNECTION_ID },
  });

  let passwordEnc: string;
  if (existing && input.keepExistingPassword && !input.password.trim()) {
    passwordEnc = existing.passwordEnc;
  } else {
    if (!input.password.trim()) {
      throw new Error("Portokasse-Passwort ist erforderlich.");
    }
    passwordEnc = encryptSecret(input.password.trim());
  }

  const clientSecretEnc = encryptSecret(app.clientSecret);

  await prisma.internetmarkeConnection.upsert({
    where: { id: INTERNETMARKE_CONNECTION_ID },
    create: {
      id: INTERNETMARKE_CONNECTION_ID,
      clientId: app.clientId,
      clientSecretEnc,
      username: input.username.trim(),
      passwordEnc,
      connectedAt: new Date(),
      lastVerifiedAt: null,
      lastError: null,
    },
    update: {
      clientId: app.clientId,
      clientSecretEnc,
      username: input.username.trim(),
      passwordEnc,
      connectedAt: existing ? existing.connectedAt : new Date(),
      // lastVerifiedAt erst nach erfolgreichem Token-Test setzen
      lastError: null,
    },
  });
}

export async function markInternetmarkeConnectionVerified(): Promise<void> {
  await getPrisma().internetmarkeConnection.update({
    where: { id: INTERNETMARKE_CONNECTION_ID },
    data: { lastVerifiedAt: new Date(), lastError: null },
  });
}

/** @deprecated Nutze `saveInternetmarkePortokasseConnection`. */
export async function saveInternetmarkeConnection(input: {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  keepExistingSecrets?: boolean;
}): Promise<void> {
  await saveInternetmarkePortokasseConnection({
    username: input.username,
    password: input.password,
    keepExistingPassword: input.keepExistingSecrets,
  });
}

export async function updateInternetmarkeSelectedProduct(input: {
  productCode: number;
  productPriceCents: number;
  productNameSnapshot: string;
}): Promise<void> {
  await getPrisma().internetmarkeConnection.update({
    where: { id: INTERNETMARKE_CONNECTION_ID },
    data: {
      productCode: input.productCode,
      productPriceCents: input.productPriceCents,
      productNameSnapshot: input.productNameSnapshot.slice(0, 200),
      lastError: null,
    },
  });
}

export async function updateInternetmarkeProductPriceCents(priceCents: number): Promise<void> {
  await getPrisma().internetmarkeConnection.update({
    where: { id: INTERNETMARKE_CONNECTION_ID },
    data: { productPriceCents: priceCents },
  });
}

export async function markInternetmarkeConnectionError(message: string): Promise<void> {
  try {
    await getPrisma().internetmarkeConnection.update({
      where: { id: INTERNETMARKE_CONNECTION_ID },
      data: { lastError: message.slice(0, 500) },
    });
  } catch {
    /* ignore */
  }
}

export async function disconnectInternetmarkeConnection(): Promise<boolean> {
  try {
    const existing = await getPrisma().internetmarkeConnection.findUnique({
      where: { id: INTERNETMARKE_CONNECTION_ID },
      select: { id: true },
    });
    if (!existing) return false;
    await getPrisma().internetmarkeConnection.delete({
      where: { id: INTERNETMARKE_CONNECTION_ID },
    });
    return true;
  } catch (e) {
    if (isMissingSchemaError(e)) return false;
    throw e;
  }
}
