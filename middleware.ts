import { type NextRequest, NextResponse } from "next/server";
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
  const response = await updateSession(request);
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
    "/((?!_next|__nextjs|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
