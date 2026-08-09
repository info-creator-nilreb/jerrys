"use client";

import { useActionState, useCallback, useId, useState } from "react";
import {
  confirmPasswordResetAction,
  requestPasswordResetAction,
  type CustomerAuthActionState,
} from "@/app/(storefront)/konto/actions";
import {
  customerAuthInputClass,
  customerAuthPrimaryButtonClass,
} from "@/components/storefront/customer-auth-shell";
import { CustomerPasswordWithCriteriaField } from "@/components/storefront/customer-password-with-criteria-field";
import { useResetPasswordFieldsOnServerError } from "@/components/storefront/use-reset-password-fields-on-server-error";
import { CUSTOMER_PASSWORD_MIN_LENGTH } from "@/features/customers/password";

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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const resetPasswordFields = useCallback(() => {
    setPassword("");
    setPasswordConfirm("");
  }, []);

  useResetPasswordFieldsOnServerError(state, resetPasswordFields);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <CustomerPasswordWithCriteriaField
        formIdPrefix={formId}
        label={
          <>
            Neues Passwort <span className="text-primary">*</span>
          </>
        }
        serverError={state?.fieldErrors?.password?.[0]}
        password={password}
        onPasswordChange={setPassword}
      />
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
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
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
