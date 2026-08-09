"use client";

import { useActionState, useId } from "react";
import {
  registerCustomerAction,
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

export function CustomerRegisterForm() {
  const formId = useId();
  const [state, action, pending] = useActionState(registerCustomerAction, initial);

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
          className={customerAuthInputClass}
          aria-invalid={Boolean(state?.fieldErrors?.email)}
        />
        {state?.fieldErrors?.email ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor={`${formId}-password`}
          className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
        >
          Passwort <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={CUSTOMER_PASSWORD_MIN_LENGTH}
          className={customerAuthInputClass}
          aria-invalid={Boolean(state?.fieldErrors?.password)}
          aria-describedby={`${formId}-password-hint`}
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
        {pending ? "Wird erstellt…" : "Konto erstellen"}
      </button>
    </form>
  );
}
