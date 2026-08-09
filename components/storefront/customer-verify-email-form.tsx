"use client";

import { useActionState } from "react";
import {
  verifyEmailAction,
  type CustomerAuthActionState,
} from "@/app/(storefront)/konto/actions";
import { customerAuthPrimaryButtonClass } from "@/components/storefront/customer-auth-shell";

const initial: CustomerAuthActionState = null;

/**
 * Bestätigung per Button — der Link aus der E-Mail lädt nur diese Seite.
 * So werden Tokens nicht schon durch Mail-Scanner beim GET verbraucht.
 */
export function CustomerVerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, initial);

  return (
    <div className="space-y-4">
      {state ? (
        <p
          className={state.ok ? "text-sm font-medium text-primary" : "text-sm text-red-600"}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-(--foreground-muted)">
          Fast geschafft — bestätige deine E-Mail-Adresse mit einem Klick. Der Link aus der
          E-Mail ist personalisiert und läuft nach einer Stunde ab.
        </p>
      )}
      {!state?.ok ? (
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={customerAuthPrimaryButtonClass} disabled={pending}>
            {pending ? "Wird bestätigt…" : "E-Mail bestätigen"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
