"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { STOREFRONT_SEARCH_MIN_LENGTH } from "@/lib/catalog/storefront-product-search";

type Props = {
  /** Aktuelle Suchanfrage (bereits geparst oder roh aus URL). */
  query: string;
  /** Zusätzliche Query-Params, die beim Absenden erhalten bleiben (z. B. sort). */
  preserveParams?: Record<string, string | undefined>;
  /** Kompakte Variante für Header-Popover. */
  compact?: boolean;
  /** Nach Submit optional Callback (z. B. Popover schließen). */
  onSubmitted?: () => void;
  id?: string;
  autoFocus?: boolean;
};

export function StorefrontSearchForm({
  query,
  preserveParams,
  compact = false,
  onSubmitted,
  id,
  autoFocus = false,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-q`;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      role="search"
      className={
        compact
          ? "flex items-center gap-2"
          : "mt-6 flex flex-col gap-2 sm:flex-row sm:items-center"
      }
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        const params = new URLSearchParams();
        if (q.length >= STOREFRONT_SEARCH_MIN_LENGTH) params.set("q", q);
        if (preserveParams) {
          for (const [key, value] of Object.entries(preserveParams)) {
            if (value) params.set(key, value);
          }
        }
        const qs = params.toString();
        startTransition(() => {
          router.push(qs ? `/produkte?${qs}` : "/produkte");
          onSubmitted?.();
        });
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Produkte suchen
      </label>
      <div className={`relative min-w-0 flex-1 ${compact ? "" : "w-full"}`}>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--foreground-muted)"
          aria-hidden
          strokeWidth={1.75}
        />
        <input
          id={inputId}
          name="q"
          type="search"
          defaultValue={query}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          minLength={STOREFRONT_SEARCH_MIN_LENGTH}
          placeholder={`Suchen (min. ${STOREFRONT_SEARCH_MIN_LENGTH} Zeichen)`}
          disabled={pending}
          className="min-h-11 w-full rounded-md border border-(--surface-muted) bg-white py-2 pr-10 pl-10 text-base text-(--foreground-heading) placeholder:text-(--foreground-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 sm:text-sm"
        />
        {query ? (
          <button
            type="button"
            className="absolute top-1/2 right-1 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-(--foreground-muted) hover:text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Suche zurücksetzen"
            disabled={pending}
            onClick={() => {
              const params = new URLSearchParams();
              if (preserveParams) {
                for (const [key, value] of Object.entries(preserveParams)) {
                  if (value) params.set(key, value);
                }
              }
              const qs = params.toString();
              startTransition(() => {
                router.push(qs ? `/produkte?${qs}` : "/produkte");
                onSubmitted?.();
              });
            }}
          >
            <X className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
            : "inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-white hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 sm:self-stretch"
        }
      >
        Suchen
      </button>
    </form>
  );
}
