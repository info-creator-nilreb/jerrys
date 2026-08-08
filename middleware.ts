import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Kein NextAuth in der Edge-Middleware: auf Vercel fehlt dort oft `AUTH_SECRET`
 * zur Laufzeit → Auth.js `MissingSecret`, obwohl Node (/api/auth, Admin-Layout) ok ist.
 * Admin-Schutz: `app/admin/(dashboard)/layout.tsx` (`auth()`).
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next|__nextjs|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
