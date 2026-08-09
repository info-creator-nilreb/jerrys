"use client";

import { useId, useState, type ReactNode } from "react";
import { CustomerPasswordCriteriaIndicator } from "@/components/storefront/customer-password-criteria-indicator";
import { customerAuthInputClass } from "@/components/storefront/customer-auth-shell";
import { CUSTOMER_PASSWORD_MIN_LENGTH } from "@/features/customers/password";

export function CustomerPasswordWithCriteriaField({
  formIdPrefix,
  label,
  name = "password",
  autoComplete = "new-password",
  serverError,
  required = true,
}: {
  formIdPrefix: string;
  label: ReactNode;
  name?: string;
  autoComplete?: "new-password" | "current-password";
  serverError?: string;
  required?: boolean;
}) {
  const reactId = useId();
  const inputId = `${formIdPrefix}-password-${reactId}`;
  const hintId = `${formIdPrefix}-password-criteria-${reactId}`;
  const [password, setPassword] = useState("");

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required={required}
        minLength={CUSTOMER_PASSWORD_MIN_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={customerAuthInputClass}
        aria-invalid={Boolean(serverError)}
        aria-describedby={hintId}
      />
      {serverError ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {serverError}
        </p>
      ) : null}
      <CustomerPasswordCriteriaIndicator password={password} id={hintId} />
    </div>
  );
}
