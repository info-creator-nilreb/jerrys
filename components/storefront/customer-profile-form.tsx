"use client";

import { useActionState, useState } from "react";
import {
  updateCustomerProfileAction,
  type CustomerPrivacyActionState,
} from "@/app/(storefront)/konto/privacy-actions";
import {
  customerAuthInputClass,
  customerAuthPrimaryButtonClass,
} from "@/components/storefront/customer-auth-shell";

const initial: CustomerPrivacyActionState = null;

const labelClass = "mb-1.5 block text-sm font-medium text-(--foreground-heading)";

export function CustomerProfileForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, action, pending] = useActionState(updateCustomerProfileAction, initial);
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);

  const fieldErr = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={action} className="space-y-4" noValidate>
      {state ? (
        <p
          className={
            state.ok
              ? "rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
              : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-firstName" className={labelClass}>
            Vorname
          </label>
          <input
            id="profile-firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className={customerAuthInputClass}
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            aria-invalid={fieldErr("firstName") ? true : undefined}
          />
          {fieldErr("firstName") ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErr("firstName")}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="profile-lastName" className={labelClass}>
            Nachname
          </label>
          <input
            id="profile-lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            className={customerAuthInputClass}
            value={last}
            onChange={(e) => setLast(e.target.value)}
            aria-invalid={fieldErr("lastName") ? true : undefined}
          />
          {fieldErr("lastName") ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErr("lastName")}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`${customerAuthPrimaryButtonClass} sm:w-auto sm:px-8`}
      >
        {pending ? "Speichern …" : "Angaben speichern"}
      </button>
    </form>
  );
}
