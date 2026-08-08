import type { NextAuthConfig } from "next-auth";
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret";

export const authConfig = {
  trustHost: true,
  /** Laufzeit-Lesen (Edge/Vercel), nicht beim Middleware-Build einfrieren. */
  get secret() {
    return resolveAuthSecret();
  },
  providers: [],
  session: { strategy: "jwt" as const, maxAge: 60 * 60 * 8 },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      if (!path.startsWith("/admin")) return true;
      if (path === "/admin/login") return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
