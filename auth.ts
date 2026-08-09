import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { syncAuthUrlForVercelPreview } from "@/lib/auth/vercel-auth-env";
import {
  assertAuthSecretForRuntime,
  resolveAuthSecret,
} from "@/lib/auth/resolve-auth-secret";
import { readAuthSecretRuntime } from "@/lib/auth/read-auth-secret-runtime";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import {
  authenticateCustomerPassword,
  consumeCustomerMagicLink,
  markCustomerLoggedIn,
  resolveAuthSubjectKind,
} from "@/features/customers";

syncAuthUrlForVercelPreview();
assertAuthSecretForRuntime("auth");

const log = createLogger("auth");

const adminCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const customerCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const magicLinkSchema = z.object({
  token: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const secret = readAuthSecretRuntime() ?? resolveAuthSecret();
  return {
    ...authConfig,
    secret,
    trustHost: true,
    providers: [
      Credentials({
        id: "credentials",
        name: "Admin",
        credentials: {
          email: { label: "E-Mail", type: "email" },
          password: { label: "Passwort", type: "password" },
        },
        authorize: async (raw) => {
          const parsed = adminCredentialsSchema.safeParse(raw);
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
            return {
              id: admin.id,
              email: admin.email,
              name: admin.email,
              subjectKind: "admin" as const,
            };
          } catch (e) {
            log.error("authorize_failed", { error: String(e) });
            return null;
          }
        },
      }),
      Credentials({
        id: "customer-credentials",
        name: "Customer",
        credentials: {
          email: { label: "E-Mail", type: "email" },
          password: { label: "Passwort", type: "password" },
        },
        authorize: async (raw) => {
          const parsed = customerCredentialsSchema.safeParse(raw);
          if (!parsed.success) return null;
          try {
            const result = await authenticateCustomerPassword(parsed.data);
            if (!result.ok) return null;
            return {
              id: result.customer.id,
              email: result.customer.email,
              name: result.customer.name,
              subjectKind: "customer" as const,
            };
          } catch (e) {
            log.error("customer_authorize_failed", { error: String(e) });
            return null;
          }
        },
      }),
      Credentials({
        id: "customer-magic-link",
        name: "Customer Magic Link",
        credentials: {
          token: { label: "Token", type: "text" },
        },
        authorize: async (raw) => {
          const parsed = magicLinkSchema.safeParse(raw);
          if (!parsed.success) return null;
          try {
            const result = await consumeCustomerMagicLink(parsed.data);
            if (!result.ok) return null;
            return {
              id: result.customer.id,
              email: result.customer.email,
              name: result.customer.name,
              subjectKind: "customer" as const,
            };
          } catch (e) {
            log.error("magic_link_authorize_failed", { error: String(e) });
            return null;
          }
        },
      }),
    ],
    events: {
      async signIn({ user }) {
        const id = user?.id;
        if (!id) return;
        const kind = resolveAuthSubjectKind(
          (user as { subjectKind?: unknown }).subjectKind,
        );
        try {
          if (kind === "customer") {
            await markCustomerLoggedIn(id);
            return;
          }
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
        if (user) {
          token.sub = user.id;
          const kind = (user as { subjectKind?: unknown }).subjectKind;
          token.subjectKind = resolveAuthSubjectKind(kind);
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
          session.user.subjectKind = resolveAuthSubjectKind(token.subjectKind);
        }
        return session;
      },
    },
  };
});
