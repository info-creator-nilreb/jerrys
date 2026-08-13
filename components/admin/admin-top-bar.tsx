"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconBell, IconMenu, IconSearch } from "@/components/admin/admin-nav-icons";
import { formatPrice } from "@/lib/catalog/format";
import type {
  AdminSearchCustomerHit,
  AdminSearchOrderHit,
  AdminSearchProductHit,
  AdminSearchResponse,
  AdminSearchScope,
} from "@/lib/admin/global-search";
import type { AdminNewOrderAlert } from "@/lib/admin/order-alerts";
import type {
  AdminNewWorkshopBookingAlert,
  AdminNewWorkshopDateRequestAlert,
} from "@/lib/admin/workshop-alerts";

/** Legacy-Key — wird einmalig auf den gemeinsamen Ack-Key migriert. */
const ORDER_ACK_STORAGE_KEY = "jerrys_admin_orders_ack_at";
const ALERT_ACK_STORAGE_KEY = "jerrys_admin_alerts_ack_at";

const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

type AdminAlertsResponse = {
  orders: AdminNewOrderAlert[];
  bookings: AdminNewWorkshopBookingAlert[];
  dateRequests: AdminNewWorkshopDateRequestAlert[];
  count: number;
};

function SearchScopeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: AdminSearchScope;
  onChange: (s: AdminSearchScope) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as AdminSearchScope)}
      className="max-w-[7.5rem] shrink-0 cursor-pointer truncate rounded bg-primary/15 py-0.5 pr-6 pl-2 text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:max-w-none sm:pr-7"
      aria-label="Suchbereich"
    >
      <option value="all">Alle</option>
      <option value="products">Produkte</option>
      <option value="orders">Bestellungen</option>
      <option value="customers">Kunden</option>
    </select>
  );
}

function readInitialAckAt(): string {
  try {
    const shared = localStorage.getItem(ALERT_ACK_STORAGE_KEY);
    if (shared) return shared;
    const legacy = localStorage.getItem(ORDER_ACK_STORAGE_KEY);
    const value = legacy || new Date().toISOString();
    localStorage.setItem(ALERT_ACK_STORAGE_KEY, value);
    return value;
  } catch {
    return new Date().toISOString();
  }
}

export function AdminTopBar({
  onOpenMobileNav,
  termineEnabled = true,
}: {
  onOpenMobileNav?: () => void;
  /** Shop-Feature-Flag: Termin-Alerts und Footer-Links in der Glocke. */
  termineEnabled?: boolean;
}) {
  const scopeFieldId = useId();
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const bellWrapRef = useRef<HTMLDivElement>(null);

  const [scope, setScope] = useState<AdminSearchScope>("all");
  const [query, setQuery] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<AdminSearchResponse | null>(null);

  const [ackAt, setAckAt] = useState<string | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [orderAlerts, setOrderAlerts] = useState<AdminNewOrderAlert[]>([]);
  const [bookingAlerts, setBookingAlerts] = useState<AdminNewWorkshopBookingAlert[]>([]);
  const [dateRequestAlerts, setDateRequestAlerts] = useState<
    AdminNewWorkshopDateRequestAlert[]
  >([]);
  const [alertLoading, setAlertLoading] = useState(false);

  const refreshAlerts = useCallback(async (since: string) => {
    setAlertLoading(true);
    try {
      const res = await fetch(
        `/api/admin/order-alerts?since=${encodeURIComponent(since)}`,
        { credentials: "same-origin" },
      );
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as AdminAlertsResponse;
      setOrderAlerts(data.orders ?? []);
      setBookingAlerts(termineEnabled ? (data.bookings ?? []) : []);
      setDateRequestAlerts(termineEnabled ? (data.dateRequests ?? []) : []);
    } finally {
      setAlertLoading(false);
    }
  }, [termineEnabled]);

  useEffect(() => {
    setAckAt(readInitialAckAt());
  }, []);

  useEffect(() => {
    if (!ackAt) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshAlerts(ackAt);
    };

    tick();
    const id = window.setInterval(tick, 50_000);
    return () => window.clearInterval(id);
  }, [ackAt, refreshAlerts]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearchLoading(false);
      setOpenSearch(false);
      return;
    }

    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/search?q=${encodeURIComponent(q)}&scope=${encodeURIComponent(scope)}`,
            { credentials: "same-origin" },
          );
          if (res.status === 401) {
            window.location.href = "/admin/login";
            return;
          }
          if (!res.ok) {
            setResults({ products: [], orders: [], customers: [] });
            setOpenSearch(true);
            return;
          }
          const data = (await res.json()) as AdminSearchResponse;
          setResults(data);
          setOpenSearch(true);
        } catch {
          setResults({ products: [], orders: [], customers: [] });
          setOpenSearch(true);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, scope]);

  useEffect(() => {
    if (!openSearch && !bellOpen) return;

    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (openSearch && searchWrapRef.current && !searchWrapRef.current.contains(t)) {
        setOpenSearch(false);
      }
      if (bellOpen && bellWrapRef.current && !bellWrapRef.current.contains(t)) {
        setBellOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenSearch(false);
        setBellOpen(false);
      }
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openSearch, bellOpen]);

  const markAlertsSeen = useCallback(() => {
    const next = new Date().toISOString();
    try {
      localStorage.setItem(ALERT_ACK_STORAGE_KEY, next);
      localStorage.setItem(ORDER_ACK_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setAckAt(next);
    setOrderAlerts([]);
    setBookingAlerts([]);
    setDateRequestAlerts([]);
    setBellOpen(false);
  }, []);

  const openBell = useCallback(() => {
    if (!ackAt) return;
    setBellOpen((o) => !o);
    void refreshAlerts(ackAt);
  }, [ackAt, refreshAlerts]);

  const newCount = orderAlerts.length + bookingAlerts.length + dateRequestAlerts.length;
  const hasAlerts = newCount > 0;
  const hasResults =
    results &&
    (results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0);
  const showEmptyPanel = !searchLoading && results && !hasResults;
  const showSearchPanel = openSearch && query.trim().length >= 2;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e4e6ea] bg-white px-3 sm:gap-3 sm:px-4 lg:gap-4 lg:px-6">
      {onOpenMobileNav ? (
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[#374151] hover:bg-[#f3f4f6] lg:hidden"
          aria-label="Menü öffnen"
          onClick={onOpenMobileNav}
        >
          <IconMenu className="size-6" aria-hidden />
        </button>
      ) : null}
      <div ref={searchWrapRef} className="relative min-h-11 min-w-0 flex-1">
        <div className="flex min-h-11 items-center gap-2 rounded-md border border-[#e4e6ea] bg-[#f7f8fa] px-2 py-1.5 lg:px-3">
          <SearchScopeSelect id={scopeFieldId} value={scope} onChange={setScope} />
          <IconSearch className="size-4 shrink-0 text-[#9ca3af]" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length >= 2) setOpenSearch(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setOpenSearch(true);
            }}
            placeholder="Suchen …"
            className="min-w-0 flex-1 bg-transparent text-base text-[#374151] outline-none placeholder:text-[#9ca3af] sm:text-sm"
            aria-label="Globale Suche"
          />
          {searchLoading ? (
            <span className="shrink-0 text-xs text-[#9ca3af]" aria-live="polite">
              …
            </span>
          ) : null}
        </div>

        {showSearchPanel ? (
          <div
            id="admin-global-search-results"
            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border border-[#e4e6ea] bg-white py-2 shadow-lg"
          >
            {searchLoading && query.trim().length >= 2 ? (
              <p className="px-4 py-3 text-sm text-[#6b7280]">Suche läuft …</p>
            ) : null}
            {showEmptyPanel ? (
              <p className="px-4 py-3 text-sm text-[#6b7280]">Keine Treffer.</p>
            ) : null}
            {!searchLoading && results && hasResults ? (
              <div className="divide-y divide-[#f3f4f6]">
                {results.products.length > 0 ? (
                  <div className="py-1">
                    <p className="px-4 pb-1 text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
                      Produkte
                    </p>
                    <ul>
                      {results.products.map((p: AdminSearchProductHit) => (
                        <li key={p.id}>
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="block px-4 py-2.5 text-sm hover:bg-[#f7f8fa]"
                            onClick={() => setOpenSearch(false)}
                          >
                            <span className="font-medium text-[#111827]">{p.title}</span>
                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                              {p.slug}
                              {p.productNumber ? ` · ${p.productNumber}` : ""}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {results.orders.length > 0 ? (
                  <div className="py-1">
                    <p className="px-4 pb-1 text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
                      Bestellungen
                    </p>
                    <ul>
                      {results.orders.map((o: AdminSearchOrderHit) => (
                        <li key={o.id}>
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="block px-4 py-2.5 text-sm hover:bg-[#f7f8fa]"
                            onClick={() => setOpenSearch(false)}
                          >
                            <span className="font-medium text-[#111827]">{o.orderNumber}</span>
                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                              {o.email} · {formatPrice(o.totalGrossCents, o.currency)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {results.customers.length > 0 ? (
                  <div className="py-1">
                    <p className="px-4 pb-1 text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
                      Kunden
                    </p>
                    <ul>
                      {results.customers.map((c: AdminSearchCustomerHit) => (
                        <li key={c.email}>
                          <Link
                            href={`/admin/customers/${c.customerKey}`}
                            className="block px-4 py-2.5 text-sm hover:bg-[#f7f8fa]"
                            onClick={() => setOpenSearch(false)}
                          >
                            <span className="font-medium text-[#111827]">{c.displayName}</span>
                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                              {c.email}
                              {c.orderCount > 1 ? ` · ${c.orderCount} Bestellungen` : ""}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div ref={bellWrapRef} className="relative flex shrink-0 items-center">
        <button
          type="button"
          className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
          title="Benachrichtigungen"
          aria-label={
            newCount > 0
              ? `${newCount} neue Benachrichtigung${newCount === 1 ? "" : "en"}`
              : "Keine neuen Benachrichtigungen"
          }
          onClick={openBell}
        >
          <IconBell className="size-5" />
          {newCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {newCount > 9 ? "9+" : newCount}
            </span>
          ) : null}
        </button>

        {bellOpen ? (
          <div className="absolute top-full right-0 z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[#e4e6ea] bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-3 py-2">
              <span className="text-sm font-semibold text-[#111827]">Benachrichtigungen</span>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={markAlertsSeen}
              >
                Alle als gelesen
              </button>
            </div>
            <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
              {alertLoading ? (
                <p className="px-3 py-4 text-sm text-[#6b7280]">Lade …</p>
              ) : !hasAlerts ? (
                <p className="px-3 py-4 text-sm text-[#6b7280]">
                  {termineEnabled
                    ? "Keine neuen Bestellungen oder Termine seit dem letzten Zurücksetzen."
                    : "Keine neuen Bestellungen seit dem letzten Zurücksetzen."}
                </p>
              ) : (
                <div className="divide-y divide-[#f3f4f6]">
                  {orderAlerts.length > 0 ? (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
                        Bestellungen
                      </p>
                      <ul>
                        {orderAlerts.map((o) => (
                          <li key={o.id} className="border-t border-[#f3f4f6] first:border-t-0">
                            <Link
                              href={`/admin/orders/${o.id}`}
                              className="block px-3 py-3 text-sm hover:bg-[#f7f8fa]"
                              onClick={() => setBellOpen(false)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-xs font-medium text-[#111827]">
                                  {o.orderNumber}
                                </span>
                                <span className="shrink-0 text-xs font-medium text-[#374151]">
                                  {formatPrice(o.totalGrossCents, o.currency)}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-[#6b7280]">{o.email}</p>
                              <p className="mt-0.5 text-xs text-[#9ca3af]">
                                {dateTimeFmt.format(new Date(o.createdAt))}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {termineEnabled && bookingAlerts.length > 0 ? (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
                        Terminbuchungen
                      </p>
                      <ul>
                        {bookingAlerts.map((b) => (
                          <li key={b.id} className="border-t border-[#f3f4f6] first:border-t-0">
                            <Link
                              href={`/admin/termine/${b.sessionId}/edit`}
                              className="block px-3 py-3 text-sm hover:bg-[#f7f8fa]"
                              onClick={() => setBellOpen(false)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-[#111827]">{b.sessionTitle}</span>
                                <span className="shrink-0 text-xs font-medium text-[#374151]">
                                  {b.seatCount} {b.seatCount === 1 ? "Platz" : "Plätze"}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-[#6b7280]">
                                {b.contactEmail}
                                {b.unitPriceCents > 0
                                  ? ` · ${formatPrice(b.unitPriceCents * b.seatCount, b.currency)}`
                                  : " · kostenlos"}
                              </p>
                              <p className="mt-0.5 text-xs text-[#9ca3af]">
                                Termin {dateTimeFmt.format(new Date(b.sessionStartsAt))} · bestätigt{" "}
                                {dateTimeFmt.format(new Date(b.confirmedAt))}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {termineEnabled && dateRequestAlerts.length > 0 ? (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
                        Wunschtermine
                      </p>
                      <ul>
                        {dateRequestAlerts.map((r) => (
                          <li key={r.id} className="border-t border-[#f3f4f6] first:border-t-0">
                            <Link
                              href="/admin/termine/wunschtermine"
                              className="block px-3 py-3 text-sm hover:bg-[#f7f8fa]"
                              onClick={() => setBellOpen(false)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-[#111827]">
                                  {r.contactName?.trim() || r.contactEmail}
                                </span>
                                <span className="shrink-0 text-xs font-medium text-[#374151]">
                                  {r.seatCount} {r.seatCount === 1 ? "Platz" : "Plätze"}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-[#6b7280]">{r.contactEmail}</p>
                              <p className="mt-0.5 text-xs text-[#9ca3af]">
                                Wunsch {dateTimeFmt.format(new Date(r.preferredStartsAt))} · eingegangen{" "}
                                {dateTimeFmt.format(new Date(r.createdAt))}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#f3f4f6] px-3 py-2">
              <Link
                href="/admin/orders"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setBellOpen(false)}
              >
                Alle Bestellungen
              </Link>
              {termineEnabled ? (
                <>
                  <Link
                    href="/admin/termine"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setBellOpen(false)}
                  >
                    Termine
                  </Link>
                  <Link
                    href="/admin/termine/wunschtermine"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setBellOpen(false)}
                  >
                    Wunschtermine
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
