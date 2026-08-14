"use server";

import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn, signOut } from "@/auth";
import {
  changeCustomerPassword,
  confirmCustomerPasswordReset,
  registerCustomer,
  requestCustomerMagicLink,
  requestCustomerPasswordReset,
  verifyCustomerEmail,
} from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { safeInternalPath } from "@/lib/http/request-pathname";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import {
  touchCustomerMagicLinkAttempt,
  touchCustomerPasswordChangeAttempt,
  touchCustomerPasswordResetAttempt,
  touchCustomerRegisterAttempt,
} from "@/lib/security/customer-auth-rate-limit";

export type CustomerAuthActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
} | null;

async function clientKey(): Promise<string> {
  const h = await headers();
  return clientIpFromHeaders(h);
}

function rateLimitedState(retryAfterSec: number): CustomerAuthActionState {
  return {
    ok: false,
    message: `Zu viele Versuche. Bitte in ca. ${retryAfterSec} Sekunden erneut versuchen.`,
  };
}

export async function registerCustomerAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const limited = touchCustomerRegisterAttempt(await clientKey());
  if (!limited.ok) return rateLimitedState(limited.retryAfterSec);

  const result = await registerCustomer({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: result.message };
}

export async function customerPasswordLoginAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeInternalPath(String(formData.get("callbackUrl") ?? ""), "/konto");
  // Header-Popover meldet im Kontext an: keine Navigation, nur Zustandswechsel.
  const stayOnPage = formData.get("stayOnPage") === "1";

  try {
    if (stayOnPage) {
      await signIn("customer-credentials", { email, password, redirect: false });
    } else {
      await signIn("customer-credentials", { email, password, redirectTo: callbackUrl });
    }
    return { ok: true, message: "Angemeldet." };
  } catch (e) {
    // Auth.js wirft bei Erfolg NEXT_REDIRECT — muss durchgereicht werden.
    if (isRedirectError(e)) throw e;
    return {
      ok: false,
      message:
        "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen oder E-Mail zuerst bestätigen.",
    };
  }
}

export async function requestMagicLinkAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const limited = touchCustomerMagicLinkAttempt(await clientKey());
  if (!limited.ok) return rateLimitedState(limited.retryAfterSec);

  const result = await requestCustomerMagicLink({
    email: formData.get("email"),
  });
  return { ok: result.ok, message: result.message };
}

export async function requestPasswordResetAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const limited = touchCustomerPasswordResetAttempt(await clientKey());
  if (!limited.ok) return rateLimitedState(limited.retryAfterSec);

  const result = await requestCustomerPasswordReset({
    email: formData.get("email"),
  });
  return { ok: result.ok, message: result.message };
}

export async function confirmPasswordResetAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const limited = touchCustomerPasswordResetAttempt(await clientKey());
  if (!limited.ok) return rateLimitedState(limited.retryAfterSec);

  const result = await confirmCustomerPasswordReset({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: result.message };
}

export async function changeCustomerPasswordAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const limited = touchCustomerPasswordChangeAttempt(await clientKey());
  if (!limited.ok) return rateLimitedState(limited.retryAfterSec);

  const currentRaw = String(formData.get("currentPassword") ?? "");
  const result = await changeCustomerPassword(session.customerId, {
    currentPassword: currentRaw.length > 0 ? currentRaw : undefined,
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: result.message };
}

export async function verifyEmailAction(
  _prev: CustomerAuthActionState,
  formData: FormData,
): Promise<CustomerAuthActionState> {
  const result = await verifyCustomerEmail({
    token: formData.get("token"),
  });
  if (!result.ok) return { ok: false, message: result.message };
  const claimed = result.claimedGuestOrderCount;
  const claimHint =
    claimed === 1
      ? " 1 frühere Bestellung wurde deinem Konto zugeordnet."
      : claimed > 1
        ? ` ${claimed} frühere Bestellungen wurden deinem Konto zugeordnet.`
        : "";
  return {
    ok: true,
    message: `E-Mail bestätigt.${claimHint} Du kannst dich jetzt anmelden.`,
  };
}

export async function customerSignOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
