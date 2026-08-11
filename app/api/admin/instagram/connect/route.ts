import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getInstagramAuthMode } from "@/lib/instagram/auth-mode";
import {
  getInstagramAdminSiteBase,
  getInstagramAppConfig,
  getInstagramOAuthReadiness,
  INSTAGRAM_OAUTH_STATE_COOKIE,
} from "@/lib/instagram/config";
import { buildFacebookAuthorizeUrl } from "@/lib/instagram/facebook-graph";
import { buildInstagramAuthorizeUrl } from "@/lib/instagram/graph-api";
import { createInstagramOAuthState } from "@/lib/instagram/oauth-state";
import { getRequestOrigin } from "@/lib/instagram/request-origin";

export async function GET(req: NextRequest) {
  const siteBase = getInstagramAdminSiteBase();
  const session = await getAdminSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/admin/login", siteBase));
  }

  const readiness = getInstagramOAuthReadiness(getRequestOrigin(req));
  if (!readiness.ready) {
    return NextResponse.redirect(
      new URL(
        "/admin/inhalte/marketing?ig=error&msg=" +
          encodeURIComponent(readiness.blockReason ?? "Instagram OAuth nicht bereit."),
        siteBase,
      ),
    );
  }

  const config = getInstagramAppConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL(
        "/admin/inhalte/marketing?ig=error&msg=" +
          encodeURIComponent(
            "Instagram App nicht konfiguriert (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / Site-URL).",
          ),
        siteBase,
      ),
    );
  }

  let state: string;
  try {
    state = createInstagramOAuthState();
  } catch {
    return NextResponse.redirect(
      new URL(
        "/admin/inhalte/marketing?ig=error&msg=" +
          encodeURIComponent("AUTH_SECRET fehlt für OAuth-State."),
        siteBase,
      ),
    );
  }

  const mode = getInstagramAuthMode();
  const authorizeUrl =
    mode === "facebook"
      ? buildFacebookAuthorizeUrl(config, state)
      : buildInstagramAuthorizeUrl(config, state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  return res;
}
