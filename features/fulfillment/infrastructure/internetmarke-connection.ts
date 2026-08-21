import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import type { InternetmarkeVoucherLayout } from "@/features/fulfillment/application/shipping-label-port";
import {
  mergeLegacyInternetmarkeProduct,
  parseInternetmarkeProductPresets,
  withUpdatedInternetmarkePresetPrice,
  type InternetmarkeProductPreset,
} from "@/features/fulfillment/domain/internetmarke-product-presets";
import {
  getInternetmarkeAppCredentialsFromEnv,
  getInternetmarkeConfigFromEnv,
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
  /** Vorgewählte Produkte (1–5) für die Auswahl beim Versand. */
  productPresets: InternetmarkeProductPreset[];
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
    productPresets: [],
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
    const productPresets = mergeLegacyInternetmarkeProduct(
      parseInternetmarkeProductPresets(row.productPresets),
      {
        productCode,
        productPriceCents,
        productNameSnapshot: row.productNameSnapshot,
      },
    );
    const clientIdMasked = app
      ? maskClientId(app.clientId)
      : maskClientId(row.clientId);
    const verified = row.lastVerifiedAt != null && !row.lastError;
    const defaultPreset = productPresets[0] ?? null;
    return {
      connected: true,
      verified,
      appCredentialsConfigured: app != null,
      clientIdMasked,
      username: row.username,
      productCode: defaultPreset?.productCode ?? productCode,
      productPriceCents: defaultPreset?.priceCents ?? productPriceCents,
      productNameSnapshot: defaultPreset?.name ?? row.productNameSnapshot,
      productPresets,
      pageFormatId: row.pageFormatId,
      voucherLayout: asLayout(row.voucherLayout),
      connectedAt: row.connectedAt,
      lastVerifiedAt: row.lastVerifiedAt,
      lastError: row.lastError,
      readyForPurchase:
        app != null &&
        verified &&
        productPresets.length > 0 &&
        productPresets.every((p) => p.productCode > 0 && p.priceCents > 0),
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
  productPresets: InternetmarkeProductPreset[];
  pageFormatId: number;
  voucherLayout: InternetmarkeVoucherLayout;
} | null> {
  try {
    const row = await getPrisma().internetmarkeConnection.findUnique({
      where: { id: INTERNETMARKE_CONNECTION_ID },
    });
    if (!row) return null;
    const app = getInternetmarkeAppCredentialsFromEnv();
    const productPresets = mergeLegacyInternetmarkeProduct(
      parseInternetmarkeProductPresets(row.productPresets),
      {
        productCode: row.productCode,
        productPriceCents: row.productPriceCents,
        productNameSnapshot: row.productNameSnapshot,
      },
    );
    const first = productPresets[0];
    return {
      clientId: app?.clientId ?? row.clientId,
      clientSecret: app?.clientSecret ?? decryptSecret(row.clientSecretEnc),
      username: row.username,
      password: decryptSecret(row.passwordEnc),
      productCode: first?.productCode ?? row.productCode,
      productPriceCents: first?.priceCents ?? row.productPriceCents,
      productPresets,
      pageFormatId: row.pageFormatId,
      voucherLayout: asLayout(row.voucherLayout),
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

/** Produkte für die Auswahl beim Label-Kauf (DB-Presets, sonst Env-Fallback). */
export async function getInternetmarkePurchasePresets(): Promise<
  InternetmarkeProductPreset[]
> {
  try {
    const pub = await getInternetmarkeConnectionPublic();
    if (pub.productPresets.length > 0) return pub.productPresets;
  } catch {
    /* Unit-Tests / Schema */
  }
  const env = getInternetmarkeConfigFromEnv();
  if (!env) return [];
  return [
    {
      productCode: env.productCode,
      name: `Produkt ${env.productCode}`,
      priceCents: env.productPriceCents,
      transport: "unknown",
      maxWeightG: null,
    },
  ];
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
  await saveInternetmarkeProductPresets([
    {
      productCode: input.productCode,
      name: input.productNameSnapshot,
      priceCents: input.productPriceCents,
      transport: "unknown",
      maxWeightG: null,
    },
  ]);
}

export async function saveInternetmarkeProductPresets(
  presets: InternetmarkeProductPreset[],
): Promise<void> {
  const normalized = parseInternetmarkeProductPresets(presets);
  const first = normalized[0] ?? null;
  await getPrisma().internetmarkeConnection.update({
    where: { id: INTERNETMARKE_CONNECTION_ID },
    data: {
      productPresets: normalized as unknown as Prisma.InputJsonValue,
      productCode: first?.productCode ?? null,
      productPriceCents: first?.priceCents ?? null,
      productNameSnapshot: first?.name ?? null,
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

export async function updateInternetmarkePresetPriceCents(
  productCode: number,
  priceCents: number,
): Promise<void> {
  const secrets = await getInternetmarkeConnectionSecrets();
  if (!secrets) return;
  const next = withUpdatedInternetmarkePresetPrice(
    secrets.productPresets,
    productCode,
    priceCents,
  );
  await saveInternetmarkeProductPresets(next);
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
