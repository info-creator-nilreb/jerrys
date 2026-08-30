import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { shouldRefreshSupabaseSessionInMiddleware } from "@/lib/http/supabase-session-middleware";
import { REQUEST_PATHNAME_HEADER } from "@/lib/http/request-pathname";
import { resolveLegacyRedirect } from "@/lib/site/legacy-redirects";
import {
  browseContextCookieOptions,
  browseContextFromPathname,
  serializeBrowseContext,
  BROWSE_CONTEXT_COOKIE,
} from "@/lib/storefront/browse-context";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Kein NextAuth in der Edge-Middleware: auf Vercel fehlt dort oft `AUTH_SECRET`
 * zur Laufzeit → Auth.js `MissingSecret`, obwohl Node (/api/auth, Admin-Layout) ok ist.
 * Admin-Schutz: `app/admin/(dashboard)/layout.tsx` (`auth()`).
 */
export async function middleware(request: NextRequest) {
  const legacyTarget = resolveLegacyRedirect(request.nextUrl.pathname);
  if (legacyTarget) {
    const url = request.nextUrl.clone();
    url.pathname = legacyTarget;
    return NextResponse.redirect(url, 301);
  }

  // Layouts kennen den angefragten Pfad nicht; das Kundenportal braucht ihn für `callbackUrl`.
  request.headers.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);

  const response = shouldRefreshSupabaseSessionInMiddleware(request.nextUrl.pathname)
    ? await updateSession(request)
    : NextResponse.next({ request: { headers: request.headers } });
  const ctx = browseContextFromPathname(request.nextUrl.pathname);
  if (ctx) {
    response.cookies.set(
      BROWSE_CONTEXT_COOKIE,
      serializeBrowseContext(ctx),
      browseContextCookieOptions(),
    );
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|__nextjs|\\.well-known|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
