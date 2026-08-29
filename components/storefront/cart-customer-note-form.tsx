"use client";

import { useActionState } from "react";
import { updateCartCustomerNote, type CartNoteActionState } from "@/lib/cart/actions";

const initial: CartNoteActionState = null;

function CartNoteSubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Wird gespeichert…" : "Notiz speichern"}
    </button>
  );
}

export function CartCustomerNoteForm({ defaultNote }: { defaultNote: string }) {
  const [state, formAction, pending] = useActionState(updateCartCustomerNote, initial);

  return (
    <form action={formAction} className="contents">
      <label htmlFor="cart-note" className="text-sm font-medium text-[#1f2937] lg:col-start-1 lg:row-start-1">
        Fügen deiner Bestellung eine Notiz hinzu
      </label>
      <textarea
        id="cart-note"
        name="note"
        rows={5}
        defaultValue={defaultNote}
        placeholder="Wie können wir dir helfen?"
        className="min-h-[8.5rem] w-full resize-y rounded-md border border-[#d2d5d9] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1 lg:col-start-1 lg:row-start-2"
      />
      <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-3">
        {state?.ok === true ? (
          <p
            className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
            role="status"
          >
            Notiz gespeichert.
          </p>
        ) : null}
        {state?.ok === false ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {state.error}
          </p>
        ) : null}
        <CartNoteSubmitButton pending={pending} />
      </div>
    </form>
  );
}
