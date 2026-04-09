import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { updateSession } from "@/utils/supabase/middleware";

export default NextAuth(authConfig).auth(async (req) => {
  return updateSession(req);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
