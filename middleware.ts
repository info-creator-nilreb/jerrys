import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";
import { assertAuthSecretForRuntime } from "@/lib/auth/resolve-auth-secret";
import { updateSession } from "@/utils/supabase/middleware";

syncAuthUrlForVercelPreview();
assertAuthSecretForRuntime("middleware");

export default NextAuth(authConfig).auth(async (req) => {
  return updateSession(req);
});

export const config = {
  matcher: [
    /*
     * /api/auth/* nicht matchen — Auth.js-Handler laufen ohne Edge-Middleware;
     * sonst getSession in der Middleware ohne zuverlässiges AUTH_SECRET (MissingSecret).
     */
    "/((?!_next|__nextjs|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
