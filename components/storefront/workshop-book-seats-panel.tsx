/**
 * Klassisches HTML-Form (MPA): POST an Route Handler, HTTP 303 zum Checkout.
 * Kein Server Action / kein useActionState — vermeidet React #441 in Production.
 */
export function WorkshopBookSeatsPanel({
  sessionId,
  seatsRemaining,
  maxSeatsPerBooking,
  capacity,
  disabled = false,
  bookingErrorMessage,
}: {
  sessionId: string;
  seatsRemaining: number;
  maxSeatsPerBooking: number | null;
  capacity: number;
  disabled?: boolean;
  bookingErrorMessage?: string | null;
}) {
  const maxSelectable = Math.min(
    seatsRemaining,
    maxSeatsPerBooking ?? capacity,
    50,
  );

  if (maxSelectable < 1 || disabled) {
    return null;
  }

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

      {bookingErrorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {bookingErrorMessage}
        </p>
      ) : null}

      <form
        action="/api/workshop/start-checkout"
        method="post"
        className="mt-4 flex flex-wrap items-end gap-3"
      >
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
            className="mt-1 w-28 rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover)"
        >
          Weiter zur Kasse
        </button>
      </form>
    </section>
  );
}
