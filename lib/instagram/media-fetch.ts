import type { InstagramMediaItem } from "@/lib/instagram/graph-api";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export const INSTAGRAM_GRAPH_MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

export function parseInstagramMediaRow(
  raw: unknown,
  options?: { requirePermalink?: boolean },
): InstagramMediaItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = typeof row.id === "string" ? row.id : "";
  const permalink = typeof row.permalink === "string" ? row.permalink : "";
  const mediaUrl = typeof row.media_url === "string" ? row.media_url : null;
  const thumbnailUrl = typeof row.thumbnail_url === "string" ? row.thumbnail_url : null;
  const requirePermalink = options?.requirePermalink ?? true;
  if (!id) return null;
  if (requirePermalink && !permalink) return null;
  if (!requirePermalink && !permalink && !mediaUrl && !thumbnailUrl) return null;
  return {
    id,
    caption: typeof row.caption === "string" ? row.caption : null,
    mediaType: typeof row.media_type === "string" ? row.media_type : "UNKNOWN",
    mediaUrl,
    thumbnailUrl,
    permalink: permalink || "https://www.instagram.com/",
    timestamp: typeof row.timestamp === "string" ? row.timestamp : null,
  };
}

export type PaginateMediaOptions = {
  /** Zielanzahl der zurückgegebenen Items (nach Typ-Filter). */
  limit: number;
  /** Nur diese media_type-Werte zählen; Pagination läuft weiter bis limit erreicht. */
  mediaTypes?: ReadonlySet<string>;
  /** Max. Roh-Seiten (Schutz vor Endlosschleifen). */
  maxPages?: number;
};

/**
 * Graph-Pagination: holt so lange nach, bis genug (gefilterte) Medien da sind.
 * Ohne mediaTypes: bisheriges Verhalten (limit Roh-Items).
 */
export async function paginateInstagramGraphMedia(
  initialUrl: string,
  options: PaginateMediaOptions,
): Promise<InstagramMediaItem[]> {
  const limit = Math.max(1, Math.min(options.limit, 50));
  const maxPages = options.maxPages ?? 10;
  const mediaTypes = options.mediaTypes;
  const items: InstagramMediaItem[] = [];
  let nextUrl: string | null = initialUrl;
  let pages = 0;

  while (nextUrl && items.length < limit && pages < maxPages) {
    pages += 1;
    const res = await fetch(nextUrl);
    const json: unknown = await res.json().catch(() => null);
    const root = asRecord(json);
    if (!res.ok) {
      const msg =
        typeof asRecord(root?.error)?.message === "string"
          ? String(asRecord(root?.error)?.message)
          : `Instagram Media-Abruf fehlgeschlagen (${res.status}).`;
      throw new Error(msg);
    }
    const data = Array.isArray(root?.data) ? root.data : [];
    for (const raw of data) {
      const item = parseInstagramMediaRow(raw);
      if (!item) continue;
      if (mediaTypes && !mediaTypes.has(item.mediaType)) continue;
      items.push(item);
      if (items.length >= limit) break;
    }
    if (items.length >= limit) break;
    const paging = asRecord(root?.paging);
    nextUrl = typeof paging?.next === "string" ? paging.next : null;
  }

  return items;
}

/** Page-Size für Graph: genug Puffer, wenn viele Videos vor Bildern liegen. */
export function instagramMediaPageSize(limit: number): number {
  return Math.max(1, Math.min(50, Math.max(limit, 25)));
}
