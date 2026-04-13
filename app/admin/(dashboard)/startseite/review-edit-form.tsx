"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateHomepageAmazonReview,
  type StartseiteFormState,
} from "@/app/admin/(dashboard)/startseite/actions";

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const singleLineClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 h-10 py-0 text-sm leading-10 text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const initial: StartseiteFormState = null;

type Review = {
  id: string;
  quote: string;
  rating: number;
  headline: string | null;
  author: string | null;
  sourceUrl: string | null;
};

export function ReviewEditForm({ review }: { review: Review }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateHomepageAmazonReview, initial);

  useEffect(() => {
    if (state?.ok) {
      router.replace("/admin/startseite");
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#1f2937]">Eintrag bearbeiten</p>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => router.replace("/admin/startseite")}
        >
          Abbrechen
        </button>
      </div>
      {state?.error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={review.id} />
        <div>
          <label htmlFor="edit-quote" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Zitat
          </label>
          <textarea
            id="edit-quote"
            name="quote"
            required
            rows={5}
            className={inputClass}
            defaultValue={review.quote}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-rating" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Sterne (1–5)
            </label>
            <select
              id="edit-rating"
              name="rating"
              className={singleLineClass}
              defaultValue={String(review.rating)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-headline" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Überschrift (optional)
            </label>
            <input
              id="edit-headline"
              name="headline"
              className={singleLineClass}
              defaultValue={review.headline ?? ""}
            />
          </div>
        </div>
        <div>
          <label htmlFor="edit-author" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Autor:in / Quelle (optional)
          </label>
          <input id="edit-author" name="author" className={singleLineClass} defaultValue={review.author ?? ""} />
        </div>
        <div>
          <label htmlFor="edit-sourceUrl" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Link zur Amazon-Seite (optional)
          </label>
          <input
            id="edit-sourceUrl"
            name="sourceUrl"
            type="url"
            className={singleLineClass}
            defaultValue={review.sourceUrl ?? ""}
            placeholder="https://www.amazon.de/…"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
