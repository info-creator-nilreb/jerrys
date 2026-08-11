import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getInstagramAuthMode } from "@/lib/instagram/auth-mode";
import {
  getInstagramAppConfig,
  INSTAGRAM_OAUTH_STATE_COOKIE,
} from "@/lib/instagram/config";
import { buildFacebookAuthorizeUrl } from "@/lib/instagram/facebook-graph";
import { buildInstagramAuthorizeUrl } from "@/lib/instagram/graph-api";
import { createInstagramOAuthState } from "@/lib/instagram/oauth-state";

export async function GET() {
  const session = await getAdminSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/admin/login", absoluteFallback()));
  }

  const config = getInstagramAppConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL(
        "/admin/inhalte/marketing?ig=error&msg=" +
          encodeURIComponent(
            "Instagram App nicht konfiguriert (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / Site-URL).",
          ),
        absoluteFallback(),
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
        absoluteFallback(),
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

function absoluteFallback(): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (site) return site.replace(/\/$/, "");
  const port = process.env.PORT ?? "3001";
  return `http://127.0.0.1:${port}`;
}
