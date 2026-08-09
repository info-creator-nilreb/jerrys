"use server";

import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn, signOut } from "@/auth";
import {
  confirmCustomerPasswordReset,
  registerCustomer,
  requestCustomerMagicLink,
  requestCustomerPasswordReset,
  verifyCustomerEmail,
} from "@/features/customers";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import {
  touchCustomerMagicLinkAttempt,
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
  const callbackUrl = String(formData.get("callbackUrl") ?? "/konto");

  try {
    await signIn("customer-credentials", {
      email,
      password,
      redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/konto",
    });
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
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: result.message };
}

export async function verifyEmailAction(token: string): Promise<CustomerAuthActionState> {
  const result = await verifyCustomerEmail({ token });
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: "E-Mail bestätigt. Du kannst dich jetzt anmelden.",
  };
}

export async function customerSignOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
