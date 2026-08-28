import type { InstagramAppConfig } from "@/lib/instagram/config";
import {
  INSTAGRAM_GRAPH_MEDIA_FIELDS,
  instagramMediaPageSize,
  paginateInstagramGraphMedia,
  parseInstagramMediaRow,
} from "@/lib/instagram/media-fetch";

export type InstagramShortLivedToken = {
  accessToken: string;
  userId: string;
  permissions: string[];
};

export type InstagramLongLivedToken = {
  accessToken: string;
  expiresIn: number;
};

export type InstagramProfile = {
  userId: string;
  username: string;
};

export type InstagramMediaItem = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function exchangeInstagramAuthCode(
  config: InstagramAppConfig,
  code: string,
): Promise<InstagramShortLivedToken> {
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Instagram Token-Tausch fehlgeschlagen (${res.status}).`);
  }
  const root = asRecord(json);
  const dataArr = Array.isArray(root?.data) ? root.data : null;
  const row = dataArr ? asRecord(dataArr[0]) : root;
  const accessToken = typeof row?.access_token === "string" ? row.access_token : "";
  const userIdRaw = row?.user_id ?? row?.userId;
  const userId =
    typeof userIdRaw === "string" || typeof userIdRaw === "number"
      ? String(userIdRaw)
      : "";
  if (!accessToken || !userId) {
    throw new Error("Instagram Token-Antwort unvollständig.");
  }
  const permissionsRaw = row?.permissions;
  const permissions = Array.isArray(permissionsRaw)
    ? permissionsRaw.filter((p): p is string => typeof p === "string")
    : typeof permissionsRaw === "string"
      ? permissionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  return { accessToken, userId, permissions };
}

export async function exchangeInstagramLongLivedToken(
  config: InstagramAppConfig,
  shortLivedToken: string,
): Promise<InstagramLongLivedToken> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("access_token", shortLivedToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  const root = asRecord(json);
  if (!res.ok) {
    throw new Error(`Instagram Long-Lived Token fehlgeschlagen (${res.status}).`);
  }
  const accessToken = typeof root?.access_token === "string" ? root.access_token : "";
  const expiresIn =
    typeof root?.expires_in === "number" ? root.expires_in : Number(root?.expires_in);
  if (!accessToken || !Number.isFinite(expiresIn)) {
    throw new Error("Instagram Long-Lived Token-Antwort unvollständig.");
  }
  return { accessToken, expiresIn };
}

export async function refreshInstagramLongLivedToken(
  accessToken: string,
): Promise<InstagramLongLivedToken> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  const root = asRecord(json);
  if (!res.ok) {
    throw new Error(`Instagram Token-Refresh fehlgeschlagen (${res.status}).`);
  }
  const next = typeof root?.access_token === "string" ? root.access_token : "";
  const expiresIn =
    typeof root?.expires_in === "number" ? root.expires_in : Number(root?.expires_in);
  if (!next || !Number.isFinite(expiresIn)) {
    throw new Error("Instagram Refresh-Antwort unvollständig.");
  }
  return { accessToken: next, expiresIn };
}

export async function fetchInstagramProfile(
  accessToken: string,
): Promise<InstagramProfile> {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  const root = asRecord(json);
  if (!res.ok) {
    throw new Error(`Instagram Profil konnte nicht geladen werden (${res.status}).`);
  }
  const userIdRaw = root?.user_id ?? root?.id;
  const userId =
    typeof userIdRaw === "string" || typeof userIdRaw === "number"
      ? String(userIdRaw)
      : "";
  const username = typeof root?.username === "string" ? root.username : "";
  if (!userId) throw new Error("Instagram Profil ohne user_id.");
  return { userId, username };
}

export async function fetchInstagramMedia(
  accessToken: string,
  limit: number,
  mediaTypes?: ReadonlySet<string>,
): Promise<InstagramMediaItem[]> {
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", INSTAGRAM_GRAPH_MEDIA_FIELDS);
  url.searchParams.set("limit", String(instagramMediaPageSize(limit)));
  url.searchParams.set("access_token", accessToken);
  return paginateInstagramGraphMedia(url.toString(), { limit, mediaTypes });
}

export async function fetchInstagramMediaById(
  accessToken: string,
  mediaId: string,
): Promise<InstagramMediaItem | null> {
  const url = new URL(`https://graph.instagram.com/${encodeURIComponent(mediaId)}`);
  url.searchParams.set("fields", INSTAGRAM_GRAPH_MEDIA_FIELDS);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) return null;
  return parseInstagramMediaRow(json, { requirePermalink: false });
}

/** Scope-String für Authorize-URL (kommagetrennt laut Meta). */
const INSTAGRAM_SCOPE_QUERY = "instagram_business_basic";

export function buildInstagramAuthorizeUrl(
  config: InstagramAppConfig,
  state: string,
): string {
  // Business Login for Instagram — client_id = Instagram App ID
  // (Meta-App-ID → "Invalid platform app"). Host laut Meta OAuth-Authorize-Reference.
  const url = new URL("https://api.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", INSTAGRAM_SCOPE_QUERY);
  url.searchParams.set("state", state);
  return url.toString();
}
