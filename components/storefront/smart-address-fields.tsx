"use client";

import { Loader2 } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ADDRESS_SUGGEST_DEBOUNCE_MS,
  ADDRESS_SUGGEST_LIMIT,
  ADDRESS_SUGGEST_STREET_MIN_LENGTH,
  ADDRESS_SUGGEST_ZIP_MIN_LENGTH,
  isAddressSuggestCountry,
  type AddressLocalitySuggestion,
  type AddressStreetSuggestion,
  type AddressSuggestResponse,
} from "@/lib/address/address-suggest-shared";
import { addressLine1HouseNumberMessage } from "@/lib/checkout/address-line-validation";
import { postalCodeErrorMessage } from "@/lib/checkout/postal-code-validation";

type SmartField = "zip" | "city" | "line1";

export type SmartAddressFieldsProps = {
  /** Aktuelles Land (ISO-2). Steuert Formatprüfung und Datenquelle. */
  country: string;
  names: { zip: string; city: string; line1: string; line2?: string };
  labels: { zip: string; city: string; line1: string; line2?: string };
  defaultValues?: { zip?: string; city?: string; line1?: string; line2?: string };
  /** Feldfehler vom Server (gewinnen über lokale Hinweise). */
  serverErrors?: Partial<Record<SmartField, string>>;
  errorIds?: Partial<Record<SmartField, string>>;
  required?: boolean;
  /** Autofill-Kontext des Browsers, z. B. `shipping` oder `billing`. */
  autoCompleteScope?: "shipping" | "billing" | "";
  inputClass: string;
  labelClass: string;
  requiredMarker?: ReactNode;
  /** Lokale Feldfehler nach außen melden (z. B. für die Checkout-Fehlerliste). */
  onLiveErrorChange?: (field: SmartField, message: string) => void;
  /** PLZ und Ort nebeneinander (Checkout) oder gestapelt. */
  zipCityLayout?: "grid" | "stack";
};

type Suggestion = { primary: string; secondary?: string };

type LocalityResult = {
  country: string;
  zip: string;
  items: AddressLocalitySuggestion[];
};

type StreetResult = {
  country: string;
  query: string;
  items: AddressStreetSuggestion[];
};

function withAutoComplete(scope: string | undefined, token: string): string {
  return scope ? `${scope} ${token}` : token;
}

/** Straßenname ohne Hausnummer — die Nummer ist für die Suche irrelevant. */
function streetQueryFromLine1(line1: string): string {
  return line1.replace(/\s+\d.*$/, "").trim();
}

function SuggestionListbox({
  listboxId,
  options,
  activeIndex,
  onActiveIndexChange,
  onPick,
}: {
  listboxId: string;
  options: Suggestion[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPick: (index: number) => void;
}) {
  return (
    <ul
      id={listboxId}
      role="listbox"
      className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-(--surface-muted) bg-white shadow-lg"
    >
      {options.map((option, index) => (
        <li key={`${option.primary}-${option.secondary ?? ""}-${index}`}>
          <button
            type="button"
            id={`${listboxId}-opt-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${
              index === activeIndex
                ? "bg-primary/10 text-(--foreground-heading)"
                : "text-(--foreground-heading) hover:bg-(--surface-soft)"
            }`}
            onMouseEnter={() => onActiveIndexChange(index)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(index)}
          >
            <span className="truncate">{option.primary}</span>
            {option.secondary ? (
              <span className="shrink-0 text-xs text-(--foreground-muted)">{option.secondary}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Progressive Adresseingabe: **PLZ → Ort → Straße und Hausnummer**.
 *
 * Vorschläge (max. 5 pro Feld) stammen aus amtlichen Verzeichnissen (OpenPLZ, DE/AT/CH/LI) und
 * sind bewusst nicht bindend: Bleibt die Suche ohne Treffer, erscheint ein Hinweis, die Eingabe
 * bleibt aber möglich (Neubaugebiete, Sonderadressen). Harte Fehler kommen nur aus der
 * Formatprüfung (PLZ-Muster, Hausnummer) und aus dem Server.
 */
export function SmartAddressFields({
  country,
  names,
  labels,
  defaultValues,
  serverErrors,
  errorIds,
  required = false,
  autoCompleteScope = "",
  inputClass,
  labelClass,
  requiredMarker,
  onLiveErrorChange,
  zipCityLayout = "grid",
}: SmartAddressFieldsProps) {
  const uid = useId();
  const cityListboxId = `${uid}-city-listbox`;
  const streetListboxId = `${uid}-street-listbox`;

  const [zip, setZip] = useState(defaultValues?.zip ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [line1, setLine1] = useState(defaultValues?.line1 ?? "");

  const [localityResult, setLocalityResult] = useState<LocalityResult | null>(null);
  const [streetResult, setStreetResult] = useState<StreetResult | null>(null);
  const [openList, setOpenList] = useState<"city" | "line1" | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState<SmartField | null>(null);
  const [liveErrors, setLiveErrors] = useState<Partial<Record<SmartField, string>>>({});
  const [status, setStatus] = useState("");
  const [needsHouseNumber, setNeedsHouseNumber] = useState(false);

  const cityTouchedRef = useRef(Boolean(defaultValues?.city));
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const streetWrapRef = useRef<HTMLDivElement>(null);
  const line1InputRef = useRef<HTMLInputElement>(null);
  const zipTimerRef = useRef<number | null>(null);
  const streetTimerRef = useRef<number | null>(null);
  const zipAbortRef = useRef<AbortController | null>(null);
  const streetAbortRef = useRef<AbortController | null>(null);
  const liveErrorListenerRef = useRef(onLiveErrorChange);
  useEffect(() => {
    liveErrorListenerRef.current = onLiveErrorChange;
  }, [onLiveErrorChange]);

  const supported = isAddressSuggestCountry(country);

  // Vorschläge gelten nur für das Land, für das sie geladen wurden.
  const localities =
    localityResult && localityResult.country === country ? localityResult.items : [];
  const streets = streetResult && streetResult.country === country ? streetResult.items : [];

  const zipComplete = postalCodeErrorMessage(country, zip) === null;
  const zipNotFound =
    supported &&
    zipComplete &&
    localityResult !== null &&
    localityResult.country === country &&
    localityResult.zip === zip.replace(/\s+/g, "") &&
    localityResult.items.length === 0;

  useEffect(
    () => () => {
      if (zipTimerRef.current !== null) window.clearTimeout(zipTimerRef.current);
      if (streetTimerRef.current !== null) window.clearTimeout(streetTimerRef.current);
      zipAbortRef.current?.abort();
      streetAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!openList) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const wrap = openList === "city" ? cityWrapRef.current : streetWrapRef.current;
      if (wrap && !wrap.contains(target)) {
        setOpenList(null);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openList]);

  const setLiveError = (field: SmartField, message: string) => {
    setLiveErrors((prev) => {
      if ((prev[field] ?? "") === message) return prev;
      return { ...prev, [field]: message };
    });
    liveErrorListenerRef.current?.(field, message);
  };

  async function requestSuggestions(
    params: URLSearchParams,
    controller: AbortController,
  ): Promise<AddressSuggestResponse | null> {
    try {
      const res = await fetch(`/api/storefront/address-suggest?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      return (await res.json()) as AddressSuggestResponse;
    } catch {
      return null;
    }
  }

  const scheduleLocalityLookup = (nextZip: string, nextCountry: string) => {
    if (zipTimerRef.current !== null) window.clearTimeout(zipTimerRef.current);
    zipAbortRef.current?.abort();

    const value = nextZip.replace(/\s+/g, "");
    if (!isAddressSuggestCountry(nextCountry) || value.length < ADDRESS_SUGGEST_ZIP_MIN_LENGTH) {
      return;
    }

    setLoading("zip");
    zipTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      zipAbortRef.current = controller;
      const params = new URLSearchParams({ land: nextCountry.toUpperCase(), plz: value });
      void requestSuggestions(params, controller).then((data) => {
        if (controller.signal.aborted) return;
        const items = data?.localities ?? [];
        setLoading(null);
        setLocalityResult({ country: nextCountry, zip: value, items });

        if (items.length === 1 && !cityTouchedRef.current) {
          setCity(items[0]!.city);
          setStatus(`Ort automatisch ergänzt: ${items[0]!.city}.`);
        } else if (items.length > 1) {
          setStatus(`${items.length} Orte zur Postleitzahl gefunden. Bitte Ort wählen.`);
        } else if (!items.length) {
          setStatus("Keinen Ort zu dieser Postleitzahl gefunden.");
        }
      });
    }, ADDRESS_SUGGEST_DEBOUNCE_MS);
  };

  const scheduleStreetLookup = (input: {
    line1: string;
    zip: string;
    city: string;
    country: string;
  }) => {
    if (streetTimerRef.current !== null) window.clearTimeout(streetTimerRef.current);
    streetAbortRef.current?.abort();

    const query = streetQueryFromLine1(input.line1);
    const zipValue = input.zip.trim();
    const cityValue = input.city.trim();
    if (
      !isAddressSuggestCountry(input.country) ||
      query.length < ADDRESS_SUGGEST_STREET_MIN_LENGTH ||
      (!zipValue && !cityValue)
    ) {
      return;
    }

    setLoading("line1");
    streetTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      streetAbortRef.current = controller;
      const params = new URLSearchParams({
        land: input.country.toUpperCase(),
        strasse: query,
      });
      if (zipValue) params.set("plz", zipValue);
      if (cityValue) params.set("ort", cityValue);
      void requestSuggestions(params, controller).then((data) => {
        if (controller.signal.aborted) return;
        const items = data?.streets ?? [];
        setLoading(null);
        setStreetResult({ country: input.country, query, items });
        if (items.length) setStatus(`${items.length} Straßenvorschläge.`);
      });
    }, ADDRESS_SUGGEST_DEBOUNCE_MS);
  };

  const cityOptions: AddressLocalitySuggestion[] = (() => {
    const typed = city.trim().toLowerCase();
    const filtered = typed
      ? localities.filter((l) => l.city.toLowerCase().includes(typed))
      : localities;
    return (filtered.length ? filtered : localities).slice(0, ADDRESS_SUGGEST_LIMIT);
  })();

  const streetOptions = streets.slice(0, ADDRESS_SUGGEST_LIMIT);

  const applyLocality = (locality: AddressLocalitySuggestion) => {
    cityTouchedRef.current = true;
    setCity(locality.city);
    const exactZip = locality.postalCode || zip;
    if (locality.postalCode && locality.postalCode !== zip.trim()) {
      setZip(locality.postalCode);
      setLiveError("zip", "");
    }
    setOpenList(null);
    setActiveIndex(-1);
    setStatus(`Ort übernommen: ${locality.postalCode} ${locality.city}.`);
    if (streetQueryFromLine1(line1).length >= ADDRESS_SUGGEST_STREET_MIN_LENGTH) {
      scheduleStreetLookup({ line1, zip: exactZip, city: locality.city, country });
    }
  };

  const applyStreet = (street: AddressStreetSuggestion) => {
    // Straße ohne Nummer übernehmen und Fokus halten: die Hausnummer kennt nur der Kunde.
    setLine1(`${street.street} `);
    if (street.postalCode && street.postalCode !== zip.trim()) setZip(street.postalCode);
    if (street.city && !city.trim()) {
      cityTouchedRef.current = true;
      setCity(street.city);
    }
    setOpenList(null);
    setActiveIndex(-1);
    setNeedsHouseNumber(true);
    setLiveError("line1", "");
    setStatus("Straße übernommen. Bitte Hausnummer ergänzen.");
    window.requestAnimationFrame(() => {
      const el = line1InputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const onListKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    list: "city" | "line1",
    count: number,
    onPick: (index: number) => void,
  ) => {
    if (e.key === "Escape") {
      if (openList === list) {
        e.preventDefault();
        e.stopPropagation();
        setOpenList(null);
        setActiveIndex(-1);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!count) return;
      e.preventDefault();
      if (openList !== list) {
        setOpenList(list);
        setActiveIndex(e.key === "ArrowDown" ? 0 : count - 1);
        return;
      }
      setActiveIndex((i) => {
        if (e.key === "ArrowDown") return (i + 1) % count;
        return i <= 0 ? count - 1 : i - 1;
      });
      return;
    }
    if (e.key === "Enter" && openList === list && activeIndex >= 0) {
      e.preventDefault();
      onPick(activeIndex);
    }
  };

  const onZipBlur = (e: FocusEvent<HTMLInputElement>) => {
    setLiveError("zip", postalCodeErrorMessage(country, e.target.value) ?? "");
  };

  const onLine1Blur = (e: FocusEvent<HTMLInputElement>) => {
    const msg = addressLine1HouseNumberMessage(country, e.target.value) ?? "";
    setLiveError("line1", msg);
    if (!msg) setNeedsHouseNumber(false);
  };

  const errorFor = (field: SmartField): string | undefined =>
    serverErrors?.[field] || liveErrors[field] || undefined;

  const errorId = (field: SmartField) => errorIds?.[field] ?? `${uid}-${field}-error`;

  const fieldError = (field: SmartField) => {
    const err = errorFor(field);
    if (!err) return null;
    return (
      <p id={errorId(field)} className="mt-1 text-sm text-red-600" role="alert">
        {err}
      </p>
    );
  };

  const cityListOpen = openList === "city" && cityOptions.length > 0;
  const streetListOpen = openList === "line1" && streetOptions.length > 0;

  const zipCityWrapperClass =
    zipCityLayout === "grid"
      ? "grid gap-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]"
      : "space-y-4";

  return (
    <>
      <div className={zipCityWrapperClass}>
        <div>
          <label htmlFor={names.zip} className={labelClass}>
            {labels.zip} {required ? requiredMarker : null}
          </label>
          <div className="relative">
            <input
              id={names.zip}
              name={names.zip}
              type="text"
              inputMode="numeric"
              required={required}
              autoComplete={withAutoComplete(autoCompleteScope, "postal-code")}
              className={inputClass}
              value={zip}
              onChange={(e) => {
                const next = e.target.value;
                setZip(next);
                setLiveError("zip", "");
                scheduleLocalityLookup(next, country);
              }}
              onBlur={onZipBlur}
              aria-invalid={errorFor("zip") ? true : undefined}
              aria-describedby={errorFor("zip") ? errorId("zip") : undefined}
            />
            {loading === "zip" ? (
              <Loader2
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-(--foreground-muted)"
                aria-hidden
              />
            ) : null}
          </div>
          {fieldError("zip")}
          {!errorFor("zip") && zipNotFound ? (
            <p className="mt-1 text-sm text-amber-700">
              Zu dieser Postleitzahl haben wir keinen Ort gefunden. Bitte prüfen — die Eingabe bleibt
              möglich.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={names.city} className={labelClass}>
            {labels.city} {required ? requiredMarker : null}
          </label>
          <div className="relative" ref={cityWrapRef}>
            <input
              id={names.city}
              name={names.city}
              type="text"
              required={required}
              role={supported ? "combobox" : undefined}
              aria-autocomplete={supported ? "list" : undefined}
              aria-expanded={supported ? cityListOpen : undefined}
              aria-controls={supported ? cityListboxId : undefined}
              aria-activedescendant={
                cityListOpen && activeIndex >= 0 ? `${cityListboxId}-opt-${activeIndex}` : undefined
              }
              autoComplete={withAutoComplete(autoCompleteScope, "address-level2")}
              className={inputClass}
              value={city}
              onChange={(e) => {
                cityTouchedRef.current = true;
                setCity(e.target.value);
                setLiveError("city", "");
                if (localities.length) {
                  setOpenList("city");
                  setActiveIndex(-1);
                }
              }}
              onFocus={() => {
                if (cityOptions.length) setOpenList("city");
              }}
              onKeyDown={(e) =>
                onListKeyDown(e, "city", cityOptions.length, (i) => {
                  const option = cityOptions[i];
                  if (option) applyLocality(option);
                })
              }
              aria-invalid={errorFor("city") ? true : undefined}
              aria-describedby={errorFor("city") ? errorId("city") : undefined}
            />
            {cityListOpen ? (
              <SuggestionListbox
                listboxId={cityListboxId}
                options={cityOptions.map((l) => ({ primary: l.city, secondary: l.postalCode }))}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
                onPick={(i) => {
                  const option = cityOptions[i];
                  if (option) applyLocality(option);
                }}
              />
            ) : null}
          </div>
          {fieldError("city")}
        </div>
      </div>

      <div>
        <label htmlFor={names.line1} className={labelClass}>
          {labels.line1} {required ? requiredMarker : null}
        </label>
        <div className="relative" ref={streetWrapRef}>
          <input
            id={names.line1}
            name={names.line1}
            type="text"
            ref={line1InputRef}
            required={required}
            role={supported ? "combobox" : undefined}
            aria-autocomplete={supported ? "list" : undefined}
            aria-expanded={supported ? streetListOpen : undefined}
            aria-controls={supported ? streetListboxId : undefined}
            aria-activedescendant={
              streetListOpen && activeIndex >= 0
                ? `${streetListboxId}-opt-${activeIndex}`
                : undefined
            }
            autoComplete={withAutoComplete(autoCompleteScope, "address-line1")}
            placeholder="z. B. Musterstraße 12"
            className={inputClass}
            value={line1}
            onChange={(e) => {
              const next = e.target.value;
              setLine1(next);
              setLiveError("line1", "");
              setOpenList("line1");
              setActiveIndex(-1);
              scheduleStreetLookup({ line1: next, zip, city, country });
            }}
            onFocus={() => {
              if (streetOptions.length) setOpenList("line1");
            }}
            onKeyDown={(e) =>
              onListKeyDown(e, "line1", streetOptions.length, (i) => {
                const option = streetOptions[i];
                if (option) applyStreet(option);
              })
            }
            onBlur={onLine1Blur}
            aria-invalid={errorFor("line1") ? true : undefined}
            aria-describedby={errorFor("line1") ? errorId("line1") : undefined}
          />
          {loading === "line1" ? (
            <Loader2
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-(--foreground-muted)"
              aria-hidden
            />
          ) : null}
          {streetListOpen ? (
            <SuggestionListbox
              listboxId={streetListboxId}
              options={streetOptions.map((s) => ({
                primary: s.street,
                secondary: [s.postalCode, s.city].filter(Boolean).join(" "),
              }))}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
              onPick={(i) => {
                const option = streetOptions[i];
                if (option) applyStreet(option);
              }}
            />
          ) : null}
        </div>
        {fieldError("line1")}
        {!errorFor("line1") && needsHouseNumber ? (
          <p className="mt-1 text-sm text-(--foreground-muted)">Bitte Hausnummer ergänzen.</p>
        ) : null}
      </div>

      {names.line2 && labels.line2 ? (
        <div>
          <label htmlFor={names.line2} className={labelClass}>
            {labels.line2}
          </label>
          <input
            id={names.line2}
            name={names.line2}
            type="text"
            autoComplete={withAutoComplete(autoCompleteScope, "address-line2")}
            className={inputClass}
            defaultValue={defaultValues?.line2 ?? ""}
          />
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </>
  );
}
