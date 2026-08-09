"use client";

import { useActionState, useId } from "react";
import {
  confirmPasswordResetAction,
  requestPasswordResetAction,
  type CustomerAuthActionState,
} from "@/app/(storefront)/konto/actions";
import {
  customerAuthInputClass,
  customerAuthPrimaryButtonClass,
} from "@/components/storefront/customer-auth-shell";
import {
  CUSTOMER_PASSWORD_MIN_LENGTH,
  CUSTOMER_PASSWORD_REQUIREMENTS_HINT,
} from "@/features/customers/domain/password";

const initial: CustomerAuthActionState = null;

export function CustomerPasswordForgotForm() {
  const formId = useId();
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor={`${formId}-email`}
          className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
        >
          E-Mail <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          className={customerAuthInputClass}
        />
      </div>
      {state ? (
        <p
          className={state.ok ? "text-sm font-medium text-primary" : "text-sm text-red-600"}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={customerAuthPrimaryButtonClass} disabled={pending}>
        {pending ? "Wird gesendet…" : "Reset-Link senden"}
      </button>
    </form>
  );
}

export function CustomerPasswordResetForm({ token }: { token: string }) {
  const formId = useId();
  const [state, action, pending] = useActionState(confirmPasswordResetAction, initial);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <div>
        <label
          htmlFor={`${formId}-password`}
          className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
        >
          Neues Passwort <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={CUSTOMER_PASSWORD_MIN_LENGTH}
          className={customerAuthInputClass}
          aria-describedby={`${formId}-password-hint`}
          aria-invalid={Boolean(state?.fieldErrors?.password)}
        />
        {state?.fieldErrors?.password ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {state.fieldErrors.password[0]}
          </p>
        ) : (
          <p id={`${formId}-password-hint`} className="mt-1 text-xs text-(--foreground-muted)">
            {CUSTOMER_PASSWORD_REQUIREMENTS_HINT}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor={`${formId}-password-confirm`}
          className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
        >
          Passwort wiederholen <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-password-confirm`}
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={CUSTOMER_PASSWORD_MIN_LENGTH}
          className={customerAuthInputClass}
          aria-invalid={Boolean(state?.fieldErrors?.passwordConfirm)}
        />
        {state?.fieldErrors?.passwordConfirm ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {state.fieldErrors.passwordConfirm[0]}
          </p>
        ) : null}
      </div>
      {state ? (
        <p
          className={state.ok ? "text-sm font-medium text-primary" : "text-sm text-red-600"}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={customerAuthPrimaryButtonClass} disabled={pending}>
        {pending ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}
