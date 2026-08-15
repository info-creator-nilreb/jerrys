"use server";

import { cookies, headers } from "next/headers";
import { changeAdminPassword } from "@/lib/auth/change-admin-password";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  confirmAdminMfaSetup,
  disableAdminMfa,
  regenerateAdminMfaRecoveryCodes,
  startAdminMfaSetup,
} from "@/lib/auth/admin-mfa";
import { otpauthQrDataUrl } from "@/lib/auth/admin-mfa-qr";
import {
  ADMIN_MFA_SETUP_COOKIE,
  adminMfaSetupCookieOptions,
  decodeAdminMfaSetupCookie,
  encodeAdminMfaSetupCookie,
} from "@/lib/auth/admin-mfa-setup-cookie";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import {
  touchAdminMfaSetupAttempt,
  touchAdminPasswordChangeAttempt,
} from "@/lib/security/admin-account-rate-limit";

export type AdminKontoActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requireReauth?: boolean;
  recoveryCodes?: string[];
  setup?: { secret: string; otpauthUrl: string; qrDataUrl: string };
} | null;

async function clientKey(): Promise<string> {
  return clientIpFromHeaders(await headers());
}

function rateLimited(retryAfterSec: number): AdminKontoActionState {
  return {
    ok: false,
    message: `Zu viele Versuche. Bitte in ca. ${retryAfterSec} Sekunden erneut versuchen.`,
  };
}

export async function changeAdminPasswordAction(
  _prev: AdminKontoActionState,
  formData: FormData,
): Promise<AdminKontoActionState> {
  const session = await getAdminSession();
  if (!session?.user?.id) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const limited = touchAdminPasswordChangeAttempt(await clientKey());
  if (!limited.ok) return rateLimited(limited.retryAfterSec);

  const result = await changeAdminPassword(session.user.id, {
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: result.message, requireReauth: true };
}

export async function startAdminMfaSetupAction(
  prev: AdminKontoActionState = null,
  formData: FormData = new FormData(),
): Promise<AdminKontoActionState> {
  void prev;
  void formData;
  const session = await getAdminSession();
  if (!session?.user?.id) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const limited = touchAdminMfaSetupAttempt(await clientKey());
  if (!limited.ok) return rateLimited(limited.retryAfterSec);

  const result = await startAdminMfaSetup(session.user.id);
  if (!result.ok) return { ok: false, message: result.message };

  const jar = await cookies();
  jar.set(
    ADMIN_MFA_SETUP_COOKIE,
    encodeAdminMfaSetupCookie(result.secret),
    adminMfaSetupCookieOptions(),
  );

  return {
    ok: true,
    message: "Scanne den QR-Code oder gib das Secret manuell ein, dann bestätige mit einem Code.",
    setup: {
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      qrDataUrl: await otpauthQrDataUrl(result.otpauthUrl),
    },
  };
}

export async function confirmAdminMfaSetupAction(
  _prev: AdminKontoActionState,
  formData: FormData,
): Promise<AdminKontoActionState> {
  const session = await getAdminSession();
  if (!session?.user?.id) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const limited = touchAdminMfaSetupAttempt(await clientKey());
  if (!limited.ok) return rateLimited(limited.retryAfterSec);

  const jar = await cookies();
  const secret = decodeAdminMfaSetupCookie(jar.get(ADMIN_MFA_SETUP_COOKIE)?.value);
  if (!secret) {
    return { ok: false, message: "Einrichtung abgelaufen. Bitte erneut starten." };
  }

  const result = await confirmAdminMfaSetup(
    session.user.id,
    secret,
    String(formData.get("code") ?? ""),
  );
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }

  jar.set(ADMIN_MFA_SETUP_COOKIE, "", { ...adminMfaSetupCookieOptions(), maxAge: 0 });
  return {
    ok: true,
    message: result.message,
    recoveryCodes: result.recoveryCodes,
  };
}

export async function disableAdminMfaAction(
  _prev: AdminKontoActionState,
  formData: FormData,
): Promise<AdminKontoActionState> {
  const session = await getAdminSession();
  if (!session?.user?.id) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const limited = touchAdminMfaSetupAttempt(await clientKey());
  if (!limited.ok) return rateLimited(limited.retryAfterSec);

  const result = await disableAdminMfa(session.user.id, {
    password: String(formData.get("password") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: result.message, requireReauth: true };
}

export async function regenerateAdminMfaRecoveryAction(
  _prev: AdminKontoActionState,
  formData: FormData,
): Promise<AdminKontoActionState> {
  const session = await getAdminSession();
  if (!session?.user?.id) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const limited = touchAdminMfaSetupAttempt(await clientKey());
  if (!limited.ok) return rateLimited(limited.retryAfterSec);

  const result = await regenerateAdminMfaRecoveryCodes(session.user.id, {
    password: String(formData.get("password") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return {
    ok: true,
    message: result.message,
    recoveryCodes: result.recoveryCodes,
  };
}
