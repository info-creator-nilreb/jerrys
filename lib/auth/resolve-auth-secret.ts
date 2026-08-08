/** Auth.js / NextAuth JWT signing — Vercel: in Preview & Production setzen. */
export function resolveAuthSecret(): string | undefined {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return secret || undefined;
}

export function assertAuthSecretForRuntime(scope: "auth" | "middleware"): void {
  if (process.env.NODE_ENV !== "production") return;
  if (resolveAuthSecret()) return;
  // eslint-disable-next-line no-console -- startup diagnostic for misconfigured Vercel env
  console.error(
    `[auth] AUTH_SECRET fehlt (${scope}). Admin-Login endet mit Auth.js „Server error“ (Configuration).`,
  );
}
