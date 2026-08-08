import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";
import { assertAuthSecretForRuntime, resolveAuthSecret } from "@/lib/auth/resolve-auth-secret";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";

syncAuthUrlForVercelPreview();
assertAuthSecretForRuntime("auth");

const log = createLogger("auth");

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  secret: resolveAuthSecret(),
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        try {
          const admin = await getPrisma().adminUser.findUnique({
            where: { email: parsed.data.email },
          });
          if (!admin?.isActive) {
            log.warn("admin_login_rejected", { email: parsed.data.email });
            return null;
          }
          const valid = await compare(parsed.data.password, admin.passwordHash);
          if (!valid) {
            log.warn("admin_login_rejected", { email: parsed.data.email });
            return null;
          }
          return { id: admin.id, email: admin.email, name: admin.email };
        } catch (e) {
          log.error("authorize_failed", { error: String(e) });
          return null;
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      const id = user?.id;
      if (!id) return;
      try {
        await getPrisma().adminUser.update({
          where: { id },
          data: { lastLoginAt: new Date() },
        });
      } catch (e) {
        log.warn("last_login_update_failed", { userId: id, error: String(e) });
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
}));
