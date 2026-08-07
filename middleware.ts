import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { updateSession } from "@/utils/supabase/middleware";

export default NextAuth(authConfig).auth(async (req) => {
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
