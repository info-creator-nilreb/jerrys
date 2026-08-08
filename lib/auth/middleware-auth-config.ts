import type { NextAuthConfig } from "next-auth";
import { authConfig } from "@/auth.config";
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret";

/** Pro Middleware-Aufruf — Secret zur Laufzeit (Edge), nicht beim Build einfrieren. */
export function middlewareAuthConfig(): NextAuthConfig {
  return {
    ...authConfig,
    secret: resolveAuthSecret(),
  };
}
