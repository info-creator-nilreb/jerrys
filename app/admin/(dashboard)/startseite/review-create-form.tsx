"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createHomepageAmazonReview,
  type StartseiteFormState,
} from "@/app/admin/(dashboard)/startseite/actions";

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

/** Einzeilige Felder + Select: gleiche Außenhöhe (Browser-Select sonst oft niedriger als Textfeld). */
const singleLineClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 h-10 py-0 text-sm leading-10 text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const initial: StartseiteFormState = null;

export function ReviewCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createHomepageAmazonReview, initial);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      <p className="text-sm font-medium text-[#1f2937]">Neues Zitat</p>
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="new-quote" className="mb-1 block text-xs font-medium text-[#6b7280]">
          Zitat
        </label>
        <textarea
          id="new-quote"
          name="quote"
          required
          rows={4}
          className={inputClass}
          placeholder="Kurzer Rezensionsauszug …"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-rating" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Sterne (1–5)
          </label>
          <select id="new-rating" name="rating" className={singleLineClass} defaultValue="5">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-headline" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Überschrift (optional)
          </label>
          <input id="new-headline" name="headline" className={singleLineClass} />
        </div>
      </div>
      <div>
        <label htmlFor="new-author" className="mb-1 block text-xs font-medium text-[#6b7280]">
          Autor:in / Quelle (optional)
        </label>
        <input id="new-author" name="author" className={singleLineClass} />
      </div>
      <div>
        <label htmlFor="new-sourceUrl" className="mb-1 block text-xs font-medium text-[#6b7280]">
          Link zur Amazon-Seite (optional)
        </label>
        <input
          id="new-sourceUrl"
          name="sourceUrl"
          type="url"
          className={singleLineClass}
          placeholder="https://www.amazon.de/…"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Zitat anlegen"}
      </button>
    </form>
  );
}
