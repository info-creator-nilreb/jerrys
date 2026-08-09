"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { startWorkshopCheckoutAction } from "@/app/(storefront)/termine/[sessionId]/actions";

type Props = {
  sessionId: string;
  seatsRemaining: number;
  maxSeatsPerBooking: number | null;
  capacity: number;
  disabled?: boolean;
  bookingErrorMessage?: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
    >
      {pending ? "Reserviere …" : "Weiter zur Kasse"}
    </button>
  );
}

export function WorkshopBookSeatsPanel({
  sessionId,
  seatsRemaining,
  maxSeatsPerBooking,
  capacity,
  disabled = false,
  bookingErrorMessage,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(startWorkshopCheckoutAction, null);

  useEffect(() => {
    if (state?.ok && "redirectTo" in state && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  const maxSelectable = Math.min(
    seatsRemaining,
    maxSeatsPerBooking ?? capacity,
    50,
  );

  if (maxSelectable < 1 || disabled) {
    return null;
  }

  const inlineError =
    state && !state.ok ? state.message : bookingErrorMessage;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    formAction(new FormData(e.currentTarget));
  };

  return (
    <section
      className="rounded-lg border border-(--surface-muted) bg-white p-5"
      aria-labelledby="workshop-book-seats-heading"
    >
      <h2 id="workshop-book-seats-heading" className="text-lg font-semibold text-(--foreground-heading)">
        Plätze buchen
      </h2>
      <p className="mt-1 text-sm text-(--foreground-muted)">
        Reservierung für 30 Minuten — danach Checkout abschließen. (Kein Warenkorb — direkt zur Kasse.)
      </p>

      {inlineError ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {inlineError}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <div>
          <label htmlFor="workshop-seat-count" className="block text-sm font-medium text-(--foreground-heading)">
            Anzahl Plätze
          </label>
          <input
            id="workshop-seat-count"
            name="seatCount"
            type="number"
            min={1}
            max={maxSelectable}
            defaultValue={1}
            required
            disabled={pending}
            className="mt-1 w-28 rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
          />
        </div>
        <SubmitButton />
      </form>
    </section>
  );
}
