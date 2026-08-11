import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getInstagramAuthMode } from "@/lib/instagram/auth-mode";
import {
  getInstagramAdminSiteBase,
  getInstagramAppConfig,
  INSTAGRAM_OAUTH_STATE_COOKIE,
} from "@/lib/instagram/config";
import { saveInstagramConnection } from "@/lib/instagram/connection";
import {
  exchangeFacebookAuthCode,
  exchangeFacebookLongLivedToken,
  resolveFacebookInstagramAccount,
} from "@/lib/instagram/facebook-graph";
import {
  exchangeInstagramAuthCode,
  exchangeInstagramLongLivedToken,
  fetchInstagramProfile,
} from "@/lib/instagram/graph-api";
import { verifyInstagramOAuthState } from "@/lib/instagram/oauth-state";
import { syncInstagramMediaFeed } from "@/lib/instagram/sync-media";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("instagram-oauth-callback");

function siteBase(): string {
  return getInstagramAdminSiteBase();
}

function marketingRedirect(query: Record<string, string>): NextResponse {
  const url = new URL("/admin/inhalte/marketing", siteBase());
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/admin/login", siteBase()));
  }

  const err = req.nextUrl.searchParams.get("error");
  if (err) {
    const desc = req.nextUrl.searchParams.get("error_description") ?? err;
    return marketingRedirect({ ig: "error", msg: desc });
  }

  let code = req.nextUrl.searchParams.get("code") ?? "";
  if (code.endsWith("#_")) code = code.slice(0, -2);
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value;

  if (!code) {
    return marketingRedirect({
      ig: "error",
      msg: "Kein Autorisierungscode von Meta/Instagram.",
    });
  }
  if (!state || state !== cookieState || !verifyInstagramOAuthState(state)) {
    return marketingRedirect({
      ig: "error",
      msg: "OAuth-State ungültig oder abgelaufen. Bitte erneut verbinden.",
    });
  }

  const config = getInstagramAppConfig();
  if (!config) {
    return marketingRedirect({
      ig: "error",
      msg: "Instagram App nicht konfiguriert.",
    });
  }

  const mode = getInstagramAuthMode();

  try {
    if (mode === "facebook") {
      const shortLived = await exchangeFacebookAuthCode(config, code);
      const longLived = await exchangeFacebookLongLivedToken(
        config,
        shortLived.accessToken,
      );
      const account = await resolveFacebookInstagramAccount(longLived.accessToken);
      await saveInstagramConnection({
        igUserId: account.igUserId,
        username: account.username,
        accessToken: longLived.accessToken,
        tokenExpiresAt: new Date(Date.now() + longLived.expiresIn * 1000),
        authMode: "facebook",
      });
    } else {
      const shortLived = await exchangeInstagramAuthCode(config, code);
      const longLived = await exchangeInstagramLongLivedToken(
        config,
        shortLived.accessToken,
      );
      let username = "";
      let igUserId = shortLived.userId;
      try {
        const profile = await fetchInstagramProfile(longLived.accessToken);
        username = profile.username;
        if (profile.userId) igUserId = profile.userId;
      } catch (e) {
        log.warn("instagram_profile_after_oauth_failed", errorMeta(e));
      }

      await saveInstagramConnection({
        igUserId,
        username,
        accessToken: longLived.accessToken,
        tokenExpiresAt: new Date(Date.now() + longLived.expiresIn * 1000),
        authMode: "instagram",
      });
    }

    const sync = await syncInstagramMediaFeed();
    const connLabel = mode === "facebook" ? "Facebook/Instagram" : "Instagram";
    if (!sync.ok) {
      return marketingRedirect({
        ig: "connected",
        msg: `Verbunden (${connLabel}), aber Sync: ${sync.error}`,
      });
    }
    return marketingRedirect({
      ig: "connected",
      msg: `Verbunden (${connLabel}). ${sync.synced} Bilder synchronisiert.`,
    });
  } catch (e) {
    log.error("instagram_oauth_callback_failed", errorMeta(e));
    return marketingRedirect({
      ig: "error",
      msg: e instanceof Error ? e.message : "Verbindung fehlgeschlagen.",
    });
  }
}
