import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
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
      if (path === "/admin/login" || path.startsWith("/admin/login/")) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
