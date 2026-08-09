"use client";

import { useActionState, useState } from "react";
import {
  anonymizeCustomerAccountAction,
  type CustomerPrivacyActionState,
} from "@/app/(storefront)/konto/privacy-actions";
import { customerAuthInputClass } from "@/components/storefront/customer-auth-shell";

const initial: CustomerPrivacyActionState = null;

export function CustomerDeleteAccountForm({ confirmationWord }: { confirmationWord: string }) {
  const [state, action, pending] = useActionState(anonymizeCustomerAccountAction, initial);
  const [confirmation, setConfirmation] = useState("");

  const confirmed = confirmation.trim().toUpperCase() === confirmationWord;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="delete-confirmation"
          className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
        >
          Zur Bestätigung „{confirmationWord}“ eingeben
        </label>
        <input
          id="delete-confirmation"
          name="bestaetigung"
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={`${customerAuthInputClass} sm:max-w-xs`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          aria-describedby="delete-confirmation-hint"
        />
        <p id="delete-confirmation-hint" className="mt-1 text-sm text-(--foreground-muted)">
          Der Schritt lässt sich nicht rückgängig machen.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending || !confirmed}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Konto wird gelöscht …" : "Konto endgültig löschen"}
      </button>
    </form>
  );
}
