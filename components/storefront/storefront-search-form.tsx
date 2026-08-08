"use client";

import Image from "next/image";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { formatPrice } from "@/lib/catalog/format";
import {
  STOREFRONT_SUGGEST_DEBOUNCE_MS,
  type StorefrontProductSuggestion,
  type StorefrontProductSuggestResponse,
} from "@/lib/catalog/storefront-product-suggest-shared";
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

function buildListingHref(
  q: string,
  preserveParams?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (q.length >= STOREFRONT_SEARCH_MIN_LENGTH) params.set("q", q);
  if (preserveParams) {
    for (const [key, value] of Object.entries(preserveParams)) {
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/produkte?${qs}` : "/produkte";
}

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
  const listboxId = `${generatedId}-listbox`;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(query);
  const [suggestions, setSuggestions] = useState<StorefrontProductSuggestion[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    const term = value.trim();
    if (term.length < STOREFRONT_SEARCH_MIN_LENGTH) {
      abortRef.current?.abort();
      setSuggestions([]);
      setListOpen(false);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void fetch(`/api/storefront/product-suggest?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
        .then(async (res) => {
          if (!res.ok) {
            if (seq === requestSeq.current) {
              setSuggestions([]);
              setListOpen(true);
            }
            return;
          }
          const data = (await res.json()) as StorefrontProductSuggestResponse;
          if (seq !== requestSeq.current) return;
          setSuggestions(data.suggestions ?? []);
          setListOpen(true);
          setActiveIndex(-1);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (seq === requestSeq.current) {
            setSuggestions([]);
            setListOpen(false);
          }
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    }, STOREFRONT_SUGGEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    if (!listOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setListOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [listOpen]);

  const goToListing = (q: string) => {
    startTransition(() => {
      router.push(buildListingHref(q, preserveParams));
      onSubmitted?.();
    });
    setListOpen(false);
  };

  const goToProduct = (slug: string) => {
    startTransition(() => {
      router.push(`/produkte/${slug}`);
      onSubmitted?.();
    });
    setListOpen(false);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToProduct(suggestions[activeIndex].slug);
      return;
    }
    goToListing(value.trim());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (listOpen) {
        e.preventDefault();
        e.stopPropagation();
        setListOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (suggestions.length > 0) setListOpen(true);
      return;
    }

    if (!listOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(suggestions.length - 1);
    }
  };

  const showPanel = listOpen && value.trim().length >= STOREFRONT_SEARCH_MIN_LENGTH;
  const activeOptionId =
    activeIndex >= 0 && suggestions[activeIndex]
      ? `${listboxId}-opt-${activeIndex}`
      : undefined;

  return (
    <form
      role="search"
      className={
        compact
          ? "flex items-center gap-2"
          : "mt-6 flex flex-col gap-2 sm:flex-row sm:items-center"
      }
      onSubmit={onSubmit}
    >
      <label htmlFor={inputId} className="sr-only">
        Produkte suchen
      </label>
      <div ref={wrapRef} className={`relative min-w-0 flex-1 ${compact ? "" : "w-full"}`}>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-(--foreground-muted)"
          aria-hidden
          strokeWidth={1.75}
        />
        <input
          id={inputId}
          name="q"
          type="text"
          role="combobox"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          placeholder={`Suchen (min. ${STOREFRONT_SEARCH_MIN_LENGTH} Zeichen)`}
          disabled={pending}
          onChange={(e) => {
            setValue(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (
              value.trim().length >= STOREFRONT_SEARCH_MIN_LENGTH &&
              (suggestions.length > 0 || loading)
            ) {
              setListOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          className="min-h-11 w-full rounded-md border border-(--surface-muted) bg-white py-2 pr-10 pl-10 text-base text-(--foreground-heading) placeholder:text-(--foreground-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 sm:text-sm"
        />
        {value ? (
          <button
            type="button"
            className="absolute top-1/2 right-1 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-(--foreground-muted) hover:text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Eingabe leeren"
            disabled={pending}
            onClick={() => {
              setValue("");
              setSuggestions([]);
              setListOpen(false);
              setActiveIndex(-1);
              if (query) {
                startTransition(() => {
                  router.push(buildListingHref("", preserveParams));
                  onSubmitted?.();
                });
              }
            }}
          >
            <X className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}

        {showPanel ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Produktvorschläge"
            className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-20 overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-lg"
          >
            {loading && suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-(--foreground-muted)" role="status">
                Vorschläge werden geladen…
              </p>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3">
                <p className="text-sm text-(--foreground-muted)" role="status">
                  Keine direkten Treffer.
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => goToListing(value.trim())}
                >
                  Alle Ergebnisse für „{value.trim()}“ anzeigen
                </button>
              </div>
            ) : (
              <ul className="max-h-[min(20rem,50vh)] overflow-y-auto py-1">
                {suggestions.map((item, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={item.slug} role="presentation">
                      <button
                        type="button"
                        id={`${listboxId}-opt-${index}`}
                        role="option"
                        aria-selected={active}
                        className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                          active ? "bg-(--surface-soft)" : "hover:bg-(--surface-soft)"
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goToProduct(item.slug)}
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-(--surface-muted)">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.imageAlt || item.title}
                              fill
                              className="object-cover"
                              sizes="44px"
                              unoptimized={item.imageUrl.startsWith("/")}
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-xs text-(--foreground-muted)">
                              —
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-(--foreground-heading)">
                            {item.title}
                          </span>
                          {item.subtitle ? (
                            <span className="block truncate text-xs text-(--foreground-muted)">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {item.priceGrossCents != null ? (
                          <span className="shrink-0 text-sm font-semibold text-(--foreground-heading)">
                            {formatPrice(item.priceGrossCents, item.currency)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {suggestions.length > 0 ? (
              <div className="border-t border-(--surface-muted) px-3 py-2">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-center rounded-md text-sm font-medium text-primary hover:bg-(--surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => goToListing(value.trim())}
                >
                  Alle Ergebnisse anzeigen
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <span className="sr-only" role="status" aria-live="polite">
          {loading
            ? "Vorschläge werden geladen"
            : showPanel
              ? `${suggestions.length} Vorschläge`
              : ""}
        </span>
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
