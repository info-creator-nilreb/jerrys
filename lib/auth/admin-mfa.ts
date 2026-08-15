import "server-only";

import { compare } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";
import { getShopSettings } from "@/lib/shop/shop-settings";
import {
  ADMIN_USER_MFA_DISABLED,
  ADMIN_USER_MFA_ENABLED,
  ADMIN_USER_MFA_RECOVERY_REGENERATED,
  ADMIN_USER_MFA_RECOVERY_USED,
  appendAdminUserOutbox,
} from "@/lib/auth/admin-account-events";
import {
  generateAdminMfaRecoveryCodes,
  hashAdminMfaRecoveryCode,
  normalizeAdminMfaRecoveryCode,
  recoveryCodeHashesEqual,
} from "@/lib/auth/admin-mfa-recovery";
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from "@/lib/auth/admin-totp";

const log = createLogger("admin.mfa");

export type AdminMfaCommandResult =
  | { ok: true; message: string; recoveryCodes?: string[] }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export type AdminMfaSetupStartResult =
  | { ok: true; secret: string; otpauthUrl: string }
  | { ok: false; message: string };

export async function startAdminMfaSetup(
  adminUserId: string,
): Promise<AdminMfaSetupStartResult> {
  const id = adminUserId.trim();
  if (!id) return { ok: false, message: "Nicht angemeldet." };

  const admin = await getPrisma().adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true, mfaEnabled: true },
  });
  if (!admin?.isActive) return { ok: false, message: "Konto nicht verfügbar." };
  if (admin.mfaEnabled) {
    return { ok: false, message: "Zwei-Faktor-Authentifizierung ist bereits aktiv." };
  }

  const secret = generateTotpSecret();
  const settings = await getShopSettings();
  const issuer = settings.shopName?.trim() || "jerry's";
  const otpauthUrl = buildOtpauthUrl({
    issuer,
    account: admin.email,
    secret,
  });
  return { ok: true, secret, otpauthUrl };
}

export async function confirmAdminMfaSetup(
  adminUserId: string,
  secret: string,
  code: string,
): Promise<AdminMfaCommandResult> {
  const id = adminUserId.trim();
  if (!id) return { ok: false, message: "Nicht angemeldet." };
  if (!secret) {
    return { ok: false, message: "Einrichtung abgelaufen. Bitte erneut starten." };
  }
  if (!verifyTotp(secret, code)) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: { code: ["Der Code ist nicht korrekt."] },
    };
  }

  const prisma = getPrisma();
  const admin = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, isActive: true, mfaEnabled: true },
  });
  if (!admin?.isActive) return { ok: false, message: "Konto nicht verfügbar." };
  if (admin.mfaEnabled) {
    return { ok: false, message: "Zwei-Faktor-Authentifizierung ist bereits aktiv." };
  }

  const recoveryCodes = generateAdminMfaRecoveryCodes();
  const now = new Date();
  const secretEnc = encryptSecret(secret);

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: admin.id },
      data: {
        mfaEnabled: true,
        mfaSecretEnc: secretEnc,
        mfaEnabledAt: now,
      },
    });
    await tx.adminMfaRecoveryCode.deleteMany({ where: { adminUserId: admin.id } });
    await tx.adminMfaRecoveryCode.createMany({
      data: recoveryCodes.map((raw) => ({
        adminUserId: admin.id,
        codeHash: hashAdminMfaRecoveryCode(raw),
      })),
    });
    await appendAdminUserOutbox(tx, {
      adminUserId: admin.id,
      eventType: ADMIN_USER_MFA_ENABLED,
    });
  });

  log.info("admin_mfa_enabled", { adminUserId: admin.id });
  return {
    ok: true,
    message: "Zwei-Faktor-Authentifizierung ist aktiv. Sichere die Wiederherstellungscodes jetzt.",
    recoveryCodes,
  };
}

async function assertAdminPassword(adminUserId: string, password: string) {
  const admin = await getPrisma().adminUser.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      isActive: true,
      passwordHash: true,
      mfaEnabled: true,
      mfaSecretEnc: true,
    },
  });
  if (!admin?.isActive) {
    return { ok: false as const, message: "Konto nicht verfügbar." };
  }
  const valid = await compare(password, admin.passwordHash);
  if (!valid) {
    return {
      ok: false as const,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: { password: ["Aktuelles Passwort ist nicht korrekt."] },
    };
  }
  return { ok: true as const, admin };
}

export async function disableAdminMfa(
  adminUserId: string,
  input: { password: string; code: string },
): Promise<AdminMfaCommandResult> {
  const id = adminUserId.trim();
  if (!id) return { ok: false, message: "Nicht angemeldet." };

  const auth = await assertAdminPassword(id, input.password);
  if (!auth.ok) return auth;
  if (!auth.admin.mfaEnabled || !auth.admin.mfaSecretEnc) {
    return { ok: false, message: "Zwei-Faktor-Authentifizierung ist nicht aktiv." };
  }

  const verified = await verifyAdminMfaCode(id, input.code, { consumeRecovery: true });
  if (!verified.ok) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: { code: ["Der Code ist nicht korrekt."] },
    };
  }

  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id },
      data: {
        mfaEnabled: false,
        mfaSecretEnc: null,
        mfaEnabledAt: null,
        credentialsChangedAt: new Date(),
      },
    });
    await tx.adminMfaRecoveryCode.deleteMany({ where: { adminUserId: id } });
    await appendAdminUserOutbox(tx, {
      adminUserId: id,
      eventType: ADMIN_USER_MFA_DISABLED,
    });
  });

  log.info("admin_mfa_disabled", { adminUserId: id });
  return {
    ok: true,
    message: "Zwei-Faktor-Authentifizierung wurde deaktiviert. Bitte melde dich erneut an.",
  };
}

export async function regenerateAdminMfaRecoveryCodes(
  adminUserId: string,
  input: { password: string; code: string },
): Promise<AdminMfaCommandResult> {
  const id = adminUserId.trim();
  if (!id) return { ok: false, message: "Nicht angemeldet." };

  const auth = await assertAdminPassword(id, input.password);
  if (!auth.ok) return auth;
  if (!auth.admin.mfaEnabled) {
    return { ok: false, message: "Zwei-Faktor-Authentifizierung ist nicht aktiv." };
  }

  const verified = await verifyAdminMfaCode(id, input.code, { consumeRecovery: true });
  if (!verified.ok) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: { code: ["Der Code ist nicht korrekt."] },
    };
  }

  const recoveryCodes = generateAdminMfaRecoveryCodes();
  await getPrisma().$transaction(async (tx) => {
    await tx.adminMfaRecoveryCode.deleteMany({ where: { adminUserId: id } });
    await tx.adminMfaRecoveryCode.createMany({
      data: recoveryCodes.map((raw) => ({
        adminUserId: id,
        codeHash: hashAdminMfaRecoveryCode(raw),
      })),
    });
    await appendAdminUserOutbox(tx, {
      adminUserId: id,
      eventType: ADMIN_USER_MFA_RECOVERY_REGENERATED,
    });
  });

  log.info("admin_mfa_recovery_regenerated", { adminUserId: id });
  return {
    ok: true,
    message: "Neue Wiederherstellungscodes wurden erzeugt. Sichere sie jetzt.",
    recoveryCodes,
  };
}

export async function verifyAdminMfaCode(
  adminUserId: string,
  code: string,
  options: { consumeRecovery: boolean },
): Promise<{ ok: true; usedRecovery: boolean } | { ok: false }> {
  const prisma = getPrisma();
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: {
      mfaEnabled: true,
      mfaSecretEnc: true,
      isActive: true,
      recoveryCodes: {
        where: { consumedAt: null },
        select: { id: true, codeHash: true },
      },
    },
  });
  if (!admin?.isActive || !admin.mfaEnabled || !admin.mfaSecretEnc) {
    return { ok: false };
  }

  let secret: string;
  try {
    secret = decryptSecret(admin.mfaSecretEnc);
  } catch {
    log.warn("admin_mfa_secret_decrypt_failed", { adminUserId });
    return { ok: false };
  }

  if (verifyTotp(secret, code)) {
    return { ok: true, usedRecovery: false };
  }

  const normalized = normalizeAdminMfaRecoveryCode(code);
  if (normalized.length < 8) return { ok: false };
  const incomingHash = hashAdminMfaRecoveryCode(normalized);
  const match = admin.recoveryCodes.find((row) =>
    recoveryCodeHashesEqual(row.codeHash, incomingHash),
  );
  if (!match) return { ok: false };

  if (options.consumeRecovery) {
    const used = await prisma.$transaction(async (tx) => {
      const updated = await tx.adminMfaRecoveryCode.updateMany({
        where: { id: match.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (updated.count !== 1) return false;
      await appendAdminUserOutbox(tx, {
        adminUserId,
        eventType: ADMIN_USER_MFA_RECOVERY_USED,
      });
      return true;
    });
    if (!used) return { ok: false };
    log.info("admin_mfa_recovery_used", { adminUserId });
  }

  return { ok: true, usedRecovery: true };
}

export async function verifyAdminMfaLogin(
  adminUserId: string,
  code: string,
): Promise<{ ok: true } | { ok: false }> {
  const result = await verifyAdminMfaCode(adminUserId, code, { consumeRecovery: true });
  if (!result.ok) {
    log.warn("admin_mfa_challenge_failed", { adminUserId });
    return { ok: false };
  }
  return { ok: true };
}
