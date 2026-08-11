import "server-only";

import { appendIntegrationOutbox } from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import {
  getInstagramAccessToken,
  markInstagramSyncResult,
  updateInstagramAccessToken,
} from "@/lib/instagram/connection";
import {
  fetchInstagramMedia,
  refreshInstagramLongLivedToken,
} from "@/lib/instagram/graph-api";
import { INSTAGRAM_CONNECTION_ID, INSTAGRAM_MEDIA_SYNC_LIMIT } from "@/lib/instagram/config";
import { mirrorInstagramImageUrl } from "@/lib/instagram/mirror-media";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("instagram-sync");

const IMAGE_TYPES = new Set(["IMAGE", "CAROUSEL_ALBUM"]);
const REFRESH_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;

export type InstagramSyncResult =
  | { ok: true; synced: number; skipped: number }
  | { ok: false; error: string };

async function ensureFreshToken(): Promise<{
  accessToken: string;
  username: string;
} | null> {
  const conn = await getInstagramAccessToken();
  if (!conn) return null;

  let accessToken = conn.accessToken;
  const expiresAt = conn.tokenExpiresAt?.getTime() ?? null;
  const needsRefresh =
    expiresAt !== null && expiresAt - Date.now() < REFRESH_BEFORE_MS;

  if (needsRefresh) {
    try {
      const refreshed = await refreshInstagramLongLivedToken(accessToken);
      accessToken = refreshed.accessToken;
      await updateInstagramAccessToken({
        accessToken,
        tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
      });
    } catch (e) {
      log.warn("instagram_token_refresh_failed", errorMeta(e));
      // weiter mit bestehendem Token versuchen
    }
  }

  return { accessToken, username: conn.username };
}

/**
 * Holt Bild-Medien vom verbundenen Instagram-Account und schreibt den Cache.
 */
export async function syncInstagramMediaFeed(
  limit = INSTAGRAM_MEDIA_SYNC_LIMIT,
): Promise<InstagramSyncResult> {
  try {
    const token = await ensureFreshToken();
    if (!token) {
      return { ok: false, error: "Instagram ist nicht verbunden." };
    }

    const media = await fetchInstagramMedia(token.accessToken, limit);
    const images = media.filter((m) => IMAGE_TYPES.has(m.mediaType));
    let synced = 0;
    let skipped = media.length - images.length;

    const prisma = getPrisma();
    const keepIds: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const item = images[i]!;
      const sourceUrl = item.mediaUrl ?? item.thumbnailUrl;
      if (!sourceUrl) {
        skipped += 1;
        continue;
      }
      const imageUrl = await mirrorInstagramImageUrl(item.id, sourceUrl);
      const postedAt = item.timestamp ? new Date(item.timestamp) : null;
      keepIds.push(item.id);

      await prisma.instagramMediaCache.upsert({
        where: { mediaId: item.id },
        create: {
          mediaId: item.id,
          mediaType: item.mediaType,
          caption: item.caption,
          permalink: item.permalink,
          imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
          sortOrder: i,
          syncedAt: new Date(),
          isActive: true,
        },
        update: {
          mediaType: item.mediaType,
          caption: item.caption,
          permalink: item.permalink,
          imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
          sortOrder: i,
          syncedAt: new Date(),
          isActive: true,
        },
      });
      synced += 1;
    }

    if (keepIds.length > 0) {
      await prisma.instagramMediaCache.deleteMany({
        where: { mediaId: { notIn: keepIds } },
      });
    } else {
      await prisma.instagramMediaCache.deleteMany({});
    }

    await markInstagramSyncResult({ ok: true });
    await prisma.$transaction(async (tx) => {
      await appendIntegrationOutbox(tx, {
        aggregateType: "instagram_connection",
        aggregateId: INSTAGRAM_CONNECTION_ID,
        eventType: "instagram.sync_completed",
        payload: { synced, skipped },
      });
    });

    return { ok: true, synced, skipped };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return {
        ok: false,
        error: "Datenbank-Migration für Instagram fehlt (instagram_connections).",
      };
    }
    const message = e instanceof Error ? e.message : "Sync fehlgeschlagen.";
    log.error("instagram_sync_failed", errorMeta(e));
    try {
      await markInstagramSyncResult({ ok: false, error: message });
    } catch {
      // ignore
    }
    return { ok: false, error: message };
  }
}
