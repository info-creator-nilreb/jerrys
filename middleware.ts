import NextAuth from "next-auth";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";
import { assertAuthSecretForRuntime } from "@/lib/auth/resolve-auth-secret";
import { middlewareAuthConfig } from "@/lib/auth/middleware-auth-config";
import { updateSession } from "@/utils/supabase/middleware";

syncAuthUrlForVercelPreview();
assertAuthSecretForRuntime("middleware");

export default NextAuth(middlewareAuthConfig).auth(async (req) => {
  // Auth.js-Endpoints: keine Supabase-Response — sonst können Session-/CSRF-Cookies kollidieren.
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    return;
  }
  return updateSession(req);
});

export const config = {
  matcher: [
    /*
     * Kein Auth/Supabase auf Next-Dev-Assets (HMR, Chunks, Devtools) — sonst instabiler Client.
     */
    "/((?!_next|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
