"use client";

import { useActionState, useEffect } from "react";
import {
  submitWorkshopDateRequestAction,
  type WorkshopDateRequestActionState,
} from "@/app/(storefront)/termine/wunschtermin/actions";

const initial: WorkshopDateRequestActionState = null;

type Props = {
  defaultEmail?: string;
  defaultName?: string;
  /** Eindeutige Feld-IDs bei mehreren Formularen auf einer Seite. */
  idPrefix?: string;
  /** inline = Erfolg im Overlay; page = Redirect auf Vollseite. */
  delivery?: "inline" | "page";
  onSuccess?: () => void;
};

export function WorkshopDateRequestForm({
  defaultEmail = "",
  defaultName = "",
  idPrefix = "",
  delivery = "page",
  onSuccess,
}: Props) {
  const [state, formAction, pending] = useActionState(submitWorkshopDateRequestAction, initial);
  const fe = state?.ok === false ? state.fieldErrors : undefined;
  const pid = (name: string) => `${idPrefix}${name}`;

  useEffect(() => {
    if (state?.ok === true && delivery === "inline") {
      onSuccess?.();
    }
  }, [state, delivery, onSuccess]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="delivery" value={delivery} />

      {state?.ok === false && state.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={pid("contactName")} className="block text-sm font-medium text-(--foreground-heading)">
            Name <span className="font-normal text-(--foreground-muted)">(optional)</span>
          </label>
          <input
            id={pid("contactName")}
            name="contactName"
            type="text"
            autoComplete="name"
            defaultValue={defaultName}
            className="mt-1 w-full rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
            maxLength={120}
          />
          {fe?.contactName?.[0] ? (
            <p className="mt-1 text-sm text-red-700">{fe.contactName[0]}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={pid("contactEmail")} className="block text-sm font-medium text-(--foreground-heading)">
            E-Mail <span className="text-primary">*</span>
          </label>
          <input
            id={pid("contactEmail")}
            name="contactEmail"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaultEmail}
            className="mt-1 w-full rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
          />
          {fe?.contactEmail?.[0] ? (
            <p className="mt-1 text-sm text-red-700">{fe.contactEmail[0]}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor={pid("preferredStartsAtLocal")}
            className="block text-sm font-medium text-(--foreground-heading)"
          >
            Wunschtermin <span className="text-primary">*</span>
          </label>
          <input
            id={pid("preferredStartsAtLocal")}
            name="preferredStartsAtLocal"
            type="datetime-local"
            required
            className="mt-1 w-full max-w-md rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-(--foreground-muted)">Zeitzone: Europe/Berlin</p>
          {fe?.preferredStartsAtLocal?.[0] ? (
            <p className="mt-1 text-sm text-red-700">{fe.preferredStartsAtLocal[0]}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor={pid("seatCount")} className="block text-sm font-medium text-(--foreground-heading)">
            Anzahl Plätze <span className="text-primary">*</span>
          </label>
          <input
            id={pid("seatCount")}
            name="seatCount"
            type="number"
            min={1}
            max={50}
            defaultValue={1}
            required
            className="mt-1 w-full rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
          />
          {fe?.seatCount?.[0] ? <p className="mt-1 text-sm text-red-700">{fe.seatCount[0]}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={pid("message")} className="block text-sm font-medium text-(--foreground-heading)">
            Nachricht <span className="font-normal text-(--foreground-muted)">(optional)</span>
          </label>
          <textarea
            id={pid("message")}
            name="message"
            rows={4}
            className="mt-1 w-full rounded-md border border-(--surface-muted) px-3 py-2 text-sm"
            maxLength={2000}
            placeholder="z. B. Workshop-Thema, Gruppe, besondere Wünsche"
          />
          {fe?.message?.[0] ? <p className="mt-1 text-sm text-red-700">{fe.message[0]}</p> : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Wird gesendet …" : "Wunschtermin anfragen"}
      </button>
    </form>
  );
}
