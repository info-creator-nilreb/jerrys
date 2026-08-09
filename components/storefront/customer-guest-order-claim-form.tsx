"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  claimGuestOrdersAction,
  type ClaimGuestOrdersActionState,
} from "@/app/(storefront)/konto/guest-order-actions";
import {
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";

const initial: ClaimGuestOrdersActionState = null;

export function CustomerGuestOrderClaimForm({ orderCount }: { orderCount: number }) {
  const [state, action, pending] = useActionState(claimGuestOrdersAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bestaetigt" value="ja" />
      {state && !state.ok ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className={`${customerAuthPrimaryButtonClass} sm:w-auto sm:px-8`}
        >
          {pending
            ? "Wird zugeordnet …"
            : orderCount === 1
              ? "Bestellung zuordnen"
              : `${orderCount} Bestellungen zuordnen`}
        </button>
        <Link href="/konto/bestellungen" className={customerAuthSecondaryLinkClass}>
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
