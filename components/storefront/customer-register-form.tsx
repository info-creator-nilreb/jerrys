"use client";

import { useActionState, useCallback, useId, useState } from "react";
import {
  registerCustomerAction,
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

export function CustomerRegisterForm() {
  const formId = useId();
  const [state, action, pending] = useActionState(registerCustomerAction, initial);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const resetPasswordFields = useCallback(() => {
    setPassword("");
    setPasswordConfirm("");
  }, []);

  useResetPasswordFieldsOnServerError(state, resetPasswordFields);

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${formId}-first`}
            className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
          >
            Vorname
          </label>
          <input
            id={`${formId}-first`}
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={customerAuthInputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${formId}-last`}
            className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
          >
            Nachname
          </label>
          <input
            id={`${formId}-last`}
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={customerAuthInputClass}
          />
        </div>
      </div>
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={customerAuthInputClass}
          aria-invalid={Boolean(state?.fieldErrors?.email)}
        />
        {state?.fieldErrors?.email ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>
      <CustomerPasswordWithCriteriaField
        formIdPrefix={formId}
        label={
          <>
            Passwort <span className="text-primary">*</span>
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
        {pending ? "Wird erstellt…" : "Konto erstellen"}
      </button>
    </form>
  );
}
