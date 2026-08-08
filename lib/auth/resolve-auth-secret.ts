/** Auth.js / NextAuth JWT signing — Edge + Node (kein server-only). */
export function resolveAuthSecret(): string | undefined {
  const env = process.env;
  const authSecretKey = ["AUTH", "SECRET"].join("_");
  const nextAuthSecretKey = ["NEXTAUTH", "SECRET"].join("_");

  const fromAuth = env[authSecretKey]?.trim();
  if (fromAuth) return fromAuth;

  const fromNext = env[nextAuthSecretKey]?.trim();
  if (fromNext) return fromNext;

  return (
    Reflect.get(env, authSecretKey)?.trim() ||
    Reflect.get(env, nextAuthSecretKey)?.trim() ||
    undefined
  );
}

export function assertAuthSecretForRuntime(scope: "auth" | "middleware"): void {
  if (process.env.NODE_ENV !== "production") return;
  if (resolveAuthSecret()) return;
  console.error(
    `[auth] AUTH_SECRET fehlt (${scope}). Admin-Login endet mit Auth.js „Server error“ (Configuration).`,
  );
}
