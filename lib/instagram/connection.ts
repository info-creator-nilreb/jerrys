import "server-only";

import { appendIntegrationOutbox } from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import type { InstagramAuthMode } from "@/lib/instagram/auth-mode";
import { INSTAGRAM_CONNECTION_ID } from "@/lib/instagram/config";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

export type InstagramConnectionPublic = {
  connected: boolean;
  igUserId: string | null;
  username: string | null;
  authMode: InstagramAuthMode | null;
  connectedAt: Date | null;
  tokenExpiresAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
};

function asAuthMode(value: string | null | undefined): InstagramAuthMode {
  return value === "facebook" ? "facebook" : "instagram";
}

export async function getInstagramConnectionPublic(): Promise<InstagramConnectionPublic> {
  try {
    const row = await getPrisma().instagramConnection.findUnique({
      where: { id: INSTAGRAM_CONNECTION_ID },
    });
    if (!row) {
      return {
        connected: false,
        igUserId: null,
        username: null,
        authMode: null,
        connectedAt: null,
        tokenExpiresAt: null,
        lastSyncAt: null,
        lastSyncError: null,
      };
    }
    return {
      connected: true,
      igUserId: row.igUserId,
      username: row.username || null,
      authMode: asAuthMode(row.authMode),
      connectedAt: row.connectedAt,
      tokenExpiresAt: row.tokenExpiresAt,
      lastSyncAt: row.lastSyncAt,
      lastSyncError: row.lastSyncError,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return {
        connected: false,
        igUserId: null,
        username: null,
        authMode: null,
        connectedAt: null,
        tokenExpiresAt: null,
        lastSyncAt: null,
        lastSyncError: null,
      };
    }
    throw e;
  }
}

export async function getInstagramAccessToken(): Promise<{
  accessToken: string;
  tokenExpiresAt: Date | null;
  igUserId: string;
  username: string;
  authMode: InstagramAuthMode;
} | null> {
  try {
    const row = await getPrisma().instagramConnection.findUnique({
      where: { id: INSTAGRAM_CONNECTION_ID },
    });
    if (!row) return null;
    return {
      accessToken: decryptSecret(row.accessTokenEnc),
      tokenExpiresAt: row.tokenExpiresAt,
      igUserId: row.igUserId,
      username: row.username,
      authMode: asAuthMode(row.authMode),
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export async function saveInstagramConnection(input: {
  igUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: Date | null;
  authMode: InstagramAuthMode;
}): Promise<void> {
  const prisma = getPrisma();
  const accessTokenEnc = encryptSecret(input.accessToken);
  await prisma.$transaction(async (tx) => {
    await tx.instagramConnection.upsert({
      where: { id: INSTAGRAM_CONNECTION_ID },
      create: {
        id: INSTAGRAM_CONNECTION_ID,
        igUserId: input.igUserId,
        username: input.username,
        authMode: input.authMode,
        accessTokenEnc,
        tokenExpiresAt: input.tokenExpiresAt,
        connectedAt: new Date(),
        lastSyncError: null,
      },
      update: {
        igUserId: input.igUserId,
        username: input.username,
        authMode: input.authMode,
        accessTokenEnc,
        tokenExpiresAt: input.tokenExpiresAt,
        connectedAt: new Date(),
        lastSyncError: null,
      },
    });
    await appendIntegrationOutbox(tx, {
      aggregateType: "instagram_connection",
      aggregateId: INSTAGRAM_CONNECTION_ID,
      eventType: "instagram.connected",
      payload: {
        igUserId: input.igUserId,
        username: input.username,
        authMode: input.authMode,
      },
    });
  });
}

export async function updateInstagramAccessToken(input: {
  accessToken: string;
  tokenExpiresAt: Date | null;
}): Promise<void> {
  await getPrisma().instagramConnection.update({
    where: { id: INSTAGRAM_CONNECTION_ID },
    data: {
      accessTokenEnc: encryptSecret(input.accessToken),
      tokenExpiresAt: input.tokenExpiresAt,
    },
  });
}

export async function markInstagramSyncResult(input: {
  ok: boolean;
  error?: string | null;
}): Promise<void> {
  await getPrisma().instagramConnection.update({
    where: { id: INSTAGRAM_CONNECTION_ID },
    data: input.ok
      ? { lastSyncAt: new Date(), lastSyncError: null }
      : { lastSyncError: input.error ?? "Sync fehlgeschlagen" },
  });
}

export async function disconnectInstagramConnection(): Promise<boolean> {
  const prisma = getPrisma();
  try {
    const existing = await prisma.instagramConnection.findUnique({
      where: { id: INSTAGRAM_CONNECTION_ID },
    });
    if (!existing) return false;
    await prisma.$transaction(async (tx) => {
      await tx.instagramMediaCache.deleteMany({});
      await tx.instagramConnection.delete({ where: { id: INSTAGRAM_CONNECTION_ID } });
      await appendIntegrationOutbox(tx, {
        aggregateType: "instagram_connection",
        aggregateId: INSTAGRAM_CONNECTION_ID,
        eventType: "instagram.disconnected",
        payload: { igUserId: existing.igUserId },
      });
    });
    return true;
  } catch (e) {
    if (isMissingSchemaError(e)) return false;
    throw e;
  }
}
