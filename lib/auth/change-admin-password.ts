import "server-only";

import { compare, hash } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import { adminChangePasswordSchema } from "@/lib/auth/admin-password-schema";
import {
  ADMIN_USER_PASSWORD_CHANGED,
  appendAdminUserOutbox,
} from "@/lib/auth/admin-account-events";

const log = createLogger("admin.change-password");

export type ChangeAdminPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function fieldErrorsFromZod(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key]!.push(issue.message);
  }
  return fieldErrors;
}

/**
 * Self-Service Passwort ändern (eingeloggter Admin).
 * Setzt `credentialsChangedAt`, damit ältere JWTs ungültig werden.
 */
export async function changeAdminPassword(
  adminUserId: string,
  input: unknown,
): Promise<ChangeAdminPasswordResult> {
  const id = adminUserId.trim();
  if (!id) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  const parsed = adminChangePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const prisma = getPrisma();
  const admin = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!admin?.isActive) {
    return { ok: false, message: "Konto nicht verfügbar." };
  }

  const { currentPassword, password } = parsed.data;
  const valid = await compare(currentPassword, admin.passwordHash);
  if (!valid) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: {
        currentPassword: ["Aktuelles Passwort ist nicht korrekt."],
      },
    };
  }

  const sameAsOld = await compare(password, admin.passwordHash);
  if (sameAsOld) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: {
        password: ["Das neue Passwort muss sich vom aktuellen unterscheiden."],
      },
    };
  }

  const passwordHash = await hash(password, 12);
  const changedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash, credentialsChangedAt: changedAt },
    });
    await appendAdminUserOutbox(tx, {
      adminUserId: admin.id,
      eventType: ADMIN_USER_PASSWORD_CHANGED,
    });
  });

  log.info("admin_password_changed", { adminUserId: admin.id });
  return {
    ok: true,
    message: "Dein Passwort wurde aktualisiert. Bitte melde dich erneut an.",
  };
}
