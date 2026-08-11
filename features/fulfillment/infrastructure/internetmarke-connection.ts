import "server-only";

import type { InternetmarkeVoucherLayout } from "@/features/fulfillment/application/shipping-label-port";
import type { InternetmarkeEnvConfig } from "@/features/fulfillment/infrastructure/internetmarke-config";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

export const INTERNETMARKE_CONNECTION_ID = "default" as const;

export type InternetmarkeConnectionPublic = {
  connected: boolean;
  /** Klartext API Key nur für Admin-Formular (kein Secret). */
  clientId: string | null;
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
  /** true wenn Credentials + gewähltes Produkt vorhanden. */
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
  const empty: InternetmarkeConnectionPublic = {
    connected: false,
    clientId: null,
    clientIdMasked: null,
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
    return {
      connected: true,
      clientId: row.clientId,
      clientIdMasked: maskClientId(row.clientId),
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
        productCode != null && productCode > 0 && productPriceCents != null && productPriceCents > 0,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return empty;
    throw e;
  }
}

/** Entschlüsselte Credentials aus DB (ohne Env-Fallback). */
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
    return {
      clientId: row.clientId,
      clientSecret: decryptSecret(row.clientSecretEnc),
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

export async function saveInternetmarkeConnection(input: {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /** Wenn Secret/Passwort leer: bestehende Werte behalten (nur bei Update). */
  keepExistingSecrets?: boolean;
}): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.internetmarkeConnection.findUnique({
    where: { id: INTERNETMARKE_CONNECTION_ID },
  });

  let clientSecretEnc: string;
  let passwordEnc: string;
  if (existing && input.keepExistingSecrets) {
    clientSecretEnc = input.clientSecret.trim()
      ? encryptSecret(input.clientSecret.trim())
      : existing.clientSecretEnc;
    passwordEnc = input.password.trim()
      ? encryptSecret(input.password.trim())
      : existing.passwordEnc;
  } else {
    if (!input.clientSecret.trim() || !input.password.trim()) {
      throw new Error("API Secret und Portokasse-Passwort sind erforderlich.");
    }
    clientSecretEnc = encryptSecret(input.clientSecret.trim());
    passwordEnc = encryptSecret(input.password.trim());
  }

  await prisma.internetmarkeConnection.upsert({
    where: { id: INTERNETMARKE_CONNECTION_ID },
    create: {
      id: INTERNETMARKE_CONNECTION_ID,
      clientId: input.clientId.trim(),
      clientSecretEnc,
      username: input.username.trim(),
      passwordEnc,
      connectedAt: new Date(),
      lastVerifiedAt: new Date(),
      lastError: null,
    },
    update: {
      clientId: input.clientId.trim(),
      clientSecretEnc,
      username: input.username.trim(),
      passwordEnc,
      connectedAt: existing ? existing.connectedAt : new Date(),
      lastVerifiedAt: new Date(),
      lastError: null,
    },
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
