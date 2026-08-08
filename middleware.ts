import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";
import { assertAuthSecretForRuntime } from "@/lib/auth/resolve-auth-secret";
import { updateSession } from "@/utils/supabase/middleware";

syncAuthUrlForVercelPreview();
assertAuthSecretForRuntime("middleware");

export default NextAuth(authConfig).auth(async (req) => {
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    return;
  }
  return updateSession(req);
});

export const config = {
  matcher: [
    "/((?!_next|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
