import "server-only";

import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { getInstagramAccessToken } from "@/lib/instagram/connection";
import { fetchFacebookInstagramMediaById } from "@/lib/instagram/facebook-graph"; // pragma: allowlist secret
import { fetchInstagramMediaBytes } from "@/lib/instagram/fetch-remote-media";
import { fetchInstagramMediaById } from "@/lib/instagram/graph-api";
import { mirrorInstagramImageUrl } from "@/lib/instagram/mirror-media";
import { isInstagramMediaCacheId } from "@/lib/instagram/storefront-media-url";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("instagram-media-proxy");

export type InstagramMediaProxyResult =
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; status: 400 | 404 | 503 };

type CacheRow = {
  id: string;
  mediaId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
};

const inflight = new Map<string, Promise<InstagramMediaProxyResult>>();

async function loadActiveCacheRow(cacheId: string): Promise<CacheRow | null> {
  const row = await getPrisma().instagramMediaCache.findFirst({
    where: { id: cacheId, isActive: true },
    select: { id: true, mediaId: true, imageUrl: true, thumbnailUrl: true },
  });
  return row;
}

async function persistRefreshedUrl(
  row: CacheRow,
  nextUrl: string,
  thumbnailUrl: string | null,
): Promise<string> {
  const imageUrl = await mirrorInstagramImageUrl(row.mediaId, nextUrl);
  await getPrisma().instagramMediaCache.update({
    where: { id: row.id },
    data: {
      imageUrl,
      thumbnailUrl: thumbnailUrl ?? row.thumbnailUrl,
      syncedAt: new Date(),
    },
  });
  return imageUrl;
}

async function refreshUrlFromGraph(row: CacheRow): Promise<string | null> {
  const conn = await getInstagramAccessToken();
  if (!conn) return null;
  const item =
    conn.authMode === "instagram"
      ? await fetchInstagramMediaById(conn.accessToken, row.mediaId)
      : await fetchFacebookInstagramMediaById(conn.accessToken, row.mediaId); // pragma: allowlist secret
  const nextUrl = item?.mediaUrl ?? item?.thumbnailUrl ?? null;
  if (!nextUrl) return null;
  try {
    return await persistRefreshedUrl(row, nextUrl, item?.thumbnailUrl ?? null);
  } catch (e) {
    log.warn("instagram_media_cache_update_failed", { mediaId: row.mediaId, ...errorMeta(e) });
    return nextUrl;
  }
}

async function bytesFromUrl(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    return await fetchInstagramMediaBytes(url);
  } catch (e) {
    log.warn("instagram_media_cdn_fetch_failed", errorMeta(e));
    return null;
  }
}

async function resolveInstagramMediaProxyUncached(
  cacheId: string,
): Promise<InstagramMediaProxyResult> {
  if (!isInstagramMediaCacheId(cacheId)) {
    return { ok: false, status: 400 };
  }

  let row: CacheRow | null;
  try {
    row = await loadActiveCacheRow(cacheId);
  } catch (e) {
    if (isMissingSchemaError(e) || isDatabaseUnreachable(e)) {
      return { ok: false, status: 503 };
    }
    throw e;
  }
  if (!row) return { ok: false, status: 404 };

  const candidates = [row.imageUrl, row.thumbnailUrl].filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );

  for (const url of candidates) {
    const fetched = await bytesFromUrl(url);
    if (fetched) return { ok: true, ...fetched };
  }

  try {
    const refreshed = await refreshUrlFromGraph(row);
    if (!refreshed) return { ok: false, status: 404 };
    const fetched = await bytesFromUrl(refreshed);
    if (fetched) return { ok: true, ...fetched };
  } catch (e) {
    log.warn("instagram_media_graph_refresh_failed", {
      mediaId: row.mediaId,
      ...errorMeta(e),
    });
  }

  return { ok: false, status: 404 };
}

/**
 * Liefert Bild-Bytes für eine aktive Cache-Zeile.
 * Bei toter CDN-URL: Graph `media_url` erneuern, optional Blob-Spiegel, Cache updaten.
 */
export async function resolveInstagramMediaProxy(
  cacheId: string,
): Promise<InstagramMediaProxyResult> {
  const existing = inflight.get(cacheId);
  if (existing) return existing;
  const pending = resolveInstagramMediaProxyUncached(cacheId).finally(() => {
    inflight.delete(cacheId);
  });
  inflight.set(cacheId, pending);
  return pending;
}
