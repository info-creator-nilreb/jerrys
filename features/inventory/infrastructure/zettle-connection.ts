import "server-only";

import {
  getZettleAttributionClientId,
  ZETTLE_CONNECTION_ID,
  ZETTLE_OAUTH_BASE_URL,
} from "@/features/inventory/infrastructure/zettle-config";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

export type ZettleConnectionPublic = {
  connected: boolean;
  verified: boolean;
  organizationUuid: string | null;
  clientIdMasked: string | null;
  connectedAt: Date | null;
  lastVerifiedAt: Date | null;
  lastPurchaseSyncAt: Date | null;
  lastSyncError: string | null;
  attributionClientIdMasked: string | null;
};

function maskId(id: string): string {
  const t = id.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export async function getZettleConnectionPublic(): Promise<ZettleConnectionPublic> {
  const attribution = getZettleAttributionClientId();
  const empty: ZettleConnectionPublic = {
    connected: false,
    verified: false,
    organizationUuid: null,
    clientIdMasked: null,
    connectedAt: null,
    lastVerifiedAt: null,
    lastSyncError: null,
    lastPurchaseSyncAt: null,
    attributionClientIdMasked: attribution ? maskId(attribution) : null,
  };
  try {
    const row = await getPrisma().zettleConnection.findUnique({
      where: { id: ZETTLE_CONNECTION_ID },
    });
    if (!row) return empty;
    const verified = row.lastVerifiedAt != null;
    return {
      connected: true,
      verified,
      organizationUuid: row.organizationUuid,
      clientIdMasked: maskId(row.clientId),
      connectedAt: row.connectedAt,
      lastVerifiedAt: row.lastVerifiedAt,
      lastPurchaseSyncAt: row.lastPurchaseSyncAt,
      lastSyncError: row.lastSyncError,
      attributionClientIdMasked: attribution ? maskId(attribution) : null,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return empty;
    throw e;
  }
}

export async function getZettleConnectionSecrets(): Promise<{
  clientId: string;
  apiKey: string;
  organizationUuid: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
} | null> {
  try {
    const row = await getPrisma().zettleConnection.findUnique({
      where: { id: ZETTLE_CONNECTION_ID },
    });
    if (!row) return null;
    return {
      clientId: row.clientId,
      apiKey: decryptSecret(row.apiKeyEnc),
      organizationUuid: row.organizationUuid,
      accessToken: row.accessTokenEnc ? decryptSecret(row.accessTokenEnc) : null,
      accessTokenExpiresAt: row.accessTokenExpiresAt,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export async function saveZettleApiKeyConnection(input: {
  clientId: string;
  apiKey: string;
  organizationUuid: string | null;
  accessToken: string;
  accessTokenExpiresAt: Date;
}): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.zettleConnection.findUnique({
    where: { id: ZETTLE_CONNECTION_ID },
  });

  await prisma.zettleConnection.upsert({
    where: { id: ZETTLE_CONNECTION_ID },
    create: {
      id: ZETTLE_CONNECTION_ID,
      clientId: input.clientId,
      apiKeyEnc: encryptSecret(input.apiKey),
      organizationUuid: input.organizationUuid,
      accessTokenEnc: encryptSecret(input.accessToken),
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      connectedAt: new Date(),
      lastVerifiedAt: new Date(),
      lastSyncError: null,
    },
    update: {
      clientId: input.clientId,
      apiKeyEnc: encryptSecret(input.apiKey),
      organizationUuid: input.organizationUuid,
      accessTokenEnc: encryptSecret(input.accessToken),
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      connectedAt: existing?.connectedAt ?? new Date(),
      lastVerifiedAt: new Date(),
      lastSyncError: null,
    },
  });
}

export async function updateZettleCachedAccessToken(input: {
  accessToken: string;
  accessTokenExpiresAt: Date;
}): Promise<void> {
  await getPrisma().zettleConnection.update({
    where: { id: ZETTLE_CONNECTION_ID },
    data: {
      accessTokenEnc: encryptSecret(input.accessToken),
      accessTokenExpiresAt: input.accessTokenExpiresAt,
    },
  });
}

export async function markZettleConnectionVerified(): Promise<void> {
  await getPrisma().zettleConnection.update({
    where: { id: ZETTLE_CONNECTION_ID },
    data: { lastVerifiedAt: new Date(), lastSyncError: null },
  });
}

export async function markZettleConnectionError(message: string): Promise<void> {
  try {
    await getPrisma().zettleConnection.update({
      where: { id: ZETTLE_CONNECTION_ID },
      data: { lastSyncError: message.slice(0, 500) },
    });
  } catch {
    /* ignore */
  }
}

export async function markZettlePurchaseSyncCompleted(): Promise<void> {
  await getPrisma().zettleConnection.update({
    where: { id: ZETTLE_CONNECTION_ID },
    data: { lastPurchaseSyncAt: new Date(), lastSyncError: null },
  });
}

export async function disconnectZettleConnection(): Promise<boolean> {
  try {
    const existing = await getPrisma().zettleConnection.findUnique({
      where: { id: ZETTLE_CONNECTION_ID },
      select: { id: true },
    });
    if (!existing) return false;
    await getPrisma().$transaction(async (tx) => {
      await tx.zettleProductMapping.deleteMany({});
      await tx.zettleConnection.delete({ where: { id: ZETTLE_CONNECTION_ID } });
    });
    return true;
  } catch (e) {
    if (isMissingSchemaError(e)) return false;
    throw e;
  }
}

/** Assertion-Grant Token-Request (ohne DB). */
export async function exchangeZettleApiKeyForToken(input: {
  clientId: string;
  apiKey: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const attribution = getZettleAttributionClientId();
  const tokenClientId = attribution || input.clientId;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    client_id: tokenClientId,
    assertion: input.apiKey,
  });

  const res = await fetch(`${ZETTLE_OAUTH_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(
      `Zettle Token-Austausch fehlgeschlagen (${res.status}).`,
    ) as Error & { responseBody?: string };
    err.responseBody = text.slice(0, 400);
    throw err;
  }

  let json: { access_token?: string; expires_in?: number };
  try {
    json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  } catch {
    throw new Error("Zettle Token-Antwort war kein JSON.");
  }
  if (!json.access_token) {
    throw new Error("Zettle Token-Antwort ohne access_token.");
  }
  return {
    accessToken: json.access_token,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : 7200,
  };
}
