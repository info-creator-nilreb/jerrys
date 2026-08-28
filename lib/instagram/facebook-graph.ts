import type { InstagramAppConfig } from "@/lib/instagram/config";
import type { InstagramLongLivedToken, InstagramMediaItem } from "@/lib/instagram/graph-api";
import {
  INSTAGRAM_GRAPH_MEDIA_FIELDS,
  instagramMediaPageSize,
  paginateInstagramGraphMedia,
  parseInstagramMediaRow,
} from "@/lib/instagram/media-fetch";

const GRAPH = "https://graph.facebook.com/v22.0";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Fallback-Scopes nur ohne Facebook-Login-for-Business-Config.
 * Mit `config_id` (empfohlen) dürfen diese NICHT mitgeschickt werden — sonst
 * „Invalid Scopes“ bei FL4B-Apps.
 */
export const FACEBOOK_LOGIN_SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

export function buildFacebookAuthorizeUrl(
  config: InstagramAppConfig,
  state: string,
): string {
  const dialog = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  dialog.searchParams.set("client_id", config.appId);
  dialog.searchParams.set("redirect_uri", config.redirectUri);
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("response_type", "code");
  const configId = config.facebookConfigId?.trim();
  if (configId) {
    // Facebook Login for Business: Permissions kommen aus der Konfiguration.
    dialog.searchParams.set("config_id", configId);
  } else {
    dialog.searchParams.set("scope", FACEBOOK_LOGIN_SCOPES);
  }
  return dialog.toString();
}

export async function exchangeFacebookAuthCode(
  config: InstagramAppConfig,
  code: string,
): Promise<{ accessToken: string; expiresIn: number | null }> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  const root = asRecord(json);
  if (!res.ok) {
    const msg =
      typeof asRecord(root?.error)?.message === "string"
        ? String(asRecord(root?.error)?.message)
        : `Facebook Token-Tausch fehlgeschlagen (${res.status}).`;
    throw new Error(msg);
  }
  const accessToken = typeof root?.access_token === "string" ? root.access_token : "";
  if (!accessToken) throw new Error("Facebook Token-Antwort unvollständig.");
  const expiresIn =
    typeof root?.expires_in === "number"
      ? root.expires_in
      : Number.isFinite(Number(root?.expires_in))
        ? Number(root?.expires_in)
        : null;
  return { accessToken, expiresIn };
}

export async function exchangeFacebookLongLivedToken(
  config: InstagramAppConfig,
  shortLivedToken: string,
): Promise<InstagramLongLivedToken> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  const root = asRecord(json);
  if (!res.ok) {
    throw new Error(`Facebook Long-Lived Token fehlgeschlagen (${res.status}).`);
  }
  const accessToken = typeof root?.access_token === "string" ? root.access_token : "";
  const expiresIn =
    typeof root?.expires_in === "number" ? root.expires_in : Number(root?.expires_in);
  if (!accessToken || !Number.isFinite(expiresIn)) {
    throw new Error("Facebook Long-Lived Token-Antwort unvollständig.");
  }
  return { accessToken, expiresIn };
}

export type FacebookIgAccount = {
  pageId: string;
  pageName: string;
  igUserId: string;
  username: string;
};

/** Findet die erste Facebook-Page mit verknüpftem Instagram Business Account. */
export async function resolveFacebookInstagramAccount(
  accessToken: string,
): Promise<FacebookIgAccount> {
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username}",
  );
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  const root = asRecord(json);
  if (!res.ok) {
    throw new Error(
      `Facebook Pages konnten nicht geladen werden (${res.status}).`,
    );
  }
  const data = Array.isArray(root?.data) ? root.data : [];
  for (const raw of data) {
    const page = asRecord(raw);
    if (!page) continue;
    const ig = asRecord(page.instagram_business_account);
    const igUserId =
      typeof ig?.id === "string" || typeof ig?.id === "number"
        ? String(ig.id)
        : "";
    if (!igUserId) continue;
    return {
      pageId: String(page.id ?? ""),
      pageName: typeof page.name === "string" ? page.name : "",
      igUserId,
      username: typeof ig?.username === "string" ? ig.username : "",
    };
  }
  throw new Error(
    "Keine Facebook-Seite mit verknüpftem Instagram-Business-Konto gefunden. Im Meta Business Suite Instagram mit einer Page verknüpfen.",
  );
}

export async function fetchFacebookInstagramMedia(
  accessToken: string,
  igUserId: string,
  limit: number,
  mediaTypes?: ReadonlySet<string>,
): Promise<InstagramMediaItem[]> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(igUserId)}/media`);
  url.searchParams.set("fields", INSTAGRAM_GRAPH_MEDIA_FIELDS);
  url.searchParams.set("limit", String(instagramMediaPageSize(limit)));
  url.searchParams.set("access_token", accessToken);
  return paginateInstagramGraphMedia(url.toString(), { limit, mediaTypes });
}

export async function fetchFacebookInstagramMediaById( // pragma: allowlist secret
  accessToken: string,
  mediaId: string,
): Promise<InstagramMediaItem | null> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(mediaId)}`);
  url.searchParams.set("fields", INSTAGRAM_GRAPH_MEDIA_FIELDS);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) return null;
  return parseInstagramMediaRow(json, { requirePermalink: false });
}
