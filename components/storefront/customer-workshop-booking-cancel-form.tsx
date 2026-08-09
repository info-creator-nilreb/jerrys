"use client";

import { useActionState } from "react";
import {
  cancelWorkshopBookingAction,
  type CancelWorkshopBookingActionState,
} from "@/app/(storefront)/konto/workshop-booking-actions";
import { customerAuthPrimaryButtonClass } from "@/components/storefront/customer-auth-shell";

const initial: CancelWorkshopBookingActionState = null;

export function CustomerWorkshopBookingCancelForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(cancelWorkshopBookingAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="bestaetigt" value="ja" />

      {state?.ok === false ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          {state.message}
        </p>
      ) : null}

      <p className="text-sm text-(--foreground-muted)">
        Mit der Stornierung gibst du deine Plätze frei. Bei kostenpflichtigen Terminen wird eine Erstattung
        ausgelöst, sobald die Zahlungsanbindung aktiv ist.
      </p>

      <button
        type="submit"
        disabled={pending || state?.ok === true}
        className={`${customerAuthPrimaryButtonClass} border border-red-300 bg-white text-red-800 hover:bg-red-50`}
      >
        {pending ? "Wird storniert …" : "Buchung stornieren"}
      </button>
    </form>
  );
}
