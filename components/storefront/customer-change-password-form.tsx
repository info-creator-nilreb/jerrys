"use client";

import { useActionState, useCallback, useEffect, useId, useState, startTransition } from "react";
import {
  changeCustomerPasswordAction,
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

export function CustomerChangePasswordForm({
  hasExistingPassword,
}: {
  /** Wenn false (Magic-Link-Konto ohne Passwort): kein aktuelles Passwort nötig. */
  hasExistingPassword: boolean;
}) {
  const formId = useId();
  const [state, action, pending] = useActionState(changeCustomerPasswordAction, initial);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const resetPasswordFields = useCallback(() => {
    setCurrentPassword("");
    setPassword("");
    setPasswordConfirm("");
  }, []);

  useResetPasswordFieldsOnServerError(state, resetPasswordFields);

  useEffect(() => {
    if (state?.ok) startTransition(() => resetPasswordFields());
  }, [state, resetPasswordFields]);

  return (
    <form action={action} className="space-y-4" noValidate>
      {hasExistingPassword ? (
        <div>
          <label
            htmlFor={`${formId}-current`}
            className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
          >
            Aktuelles Passwort <span className="text-primary">*</span>
          </label>
          <input
            id={`${formId}-current`}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={customerAuthInputClass}
            aria-invalid={Boolean(state?.fieldErrors?.currentPassword)}
          />
          {state?.fieldErrors?.currentPassword ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {state.fieldErrors.currentPassword[0]}
            </p>
          ) : null}
        </div>
      ) : null}

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
          Neues Passwort wiederholen <span className="text-primary">*</span>
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
