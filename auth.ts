import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("auth");

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          await getPrisma().adminUser.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
          });
          return { id: admin.id, email: admin.email, name: admin.email };
        } catch (e) {
          log.error("authorize_failed", { error: String(e) });
          return null;
        }
      },
    }),
  ],
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
});
