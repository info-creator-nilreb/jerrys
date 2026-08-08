import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";
import { updateSession } from "@/utils/supabase/middleware";

syncAuthUrlForVercelPreview();

export default NextAuth(authConfig).auth(async (req) => {
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
