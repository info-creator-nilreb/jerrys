"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconBell, IconSearch } from "@/components/admin/admin-nav-icons";
import { formatPrice } from "@/lib/catalog/format";
import type {
  AdminSearchCustomerHit,
  AdminSearchOrderHit,
  AdminSearchProductHit,
  AdminSearchResponse,
  AdminSearchScope,
} from "@/lib/admin/global-search";
import type { AdminNewOrderAlert } from "@/lib/admin/order-alerts";

const ORDER_ACK_STORAGE_KEY = "jerrys_admin_orders_ack_at";

const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

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

export function AdminTopBar() {
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
  const [alerts, setAlerts] = useState<AdminNewOrderAlert[]>([]);
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
      const data = (await res.json()) as { orders: AdminNewOrderAlert[]; count: number };
      setAlerts(data.orders);
    } finally {
      setAlertLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      let stored = localStorage.getItem(ORDER_ACK_STORAGE_KEY);
      if (!stored) {
        stored = new Date().toISOString();
        localStorage.setItem(ORDER_ACK_STORAGE_KEY, stored);
      }
      setAckAt(stored);
    } catch {
      setAckAt(new Date().toISOString());
    }
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

  const markOrdersSeen = useCallback(() => {
    const next = new Date().toISOString();
    try {
      localStorage.setItem(ORDER_ACK_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setAckAt(next);
    setAlerts([]);
    setBellOpen(false);
  }, []);

  const openBell = useCallback(() => {
    if (!ackAt) return;
    setBellOpen((o) => !o);
    void refreshAlerts(ackAt);
  }, [ackAt, refreshAlerts]);

  const newCount = alerts.length;
  const hasResults =
    results &&
    (results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0);
  const showEmptyPanel = !searchLoading && results && !hasResults;
  const showSearchPanel = openSearch && query.trim().length >= 2;

  return (
    <header className="flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-[#e4e6ea] bg-white px-4 lg:gap-4 lg:px-6">
      <div ref={searchWrapRef} className="relative min-h-10 min-w-0 flex-1">
        <div className="flex min-h-10 items-center gap-2 rounded-md border border-[#e4e6ea] bg-[#f7f8fa] px-2 py-1.5 lg:px-3">
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
            placeholder="Finde Produkte, Kunden, Bestellungen …"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
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
          className="relative rounded-lg p-2.5 text-[#6b7280] hover:bg-[#f3f4f6]"
          title="Neue Bestellungen"
          aria-label={
            newCount > 0
              ? `${newCount} neue Bestellung${newCount === 1 ? "" : "en"}`
              : "Keine neuen Bestellungen"
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
              <span className="text-sm font-semibold text-[#111827]">Neue Bestellungen</span>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={markOrdersSeen}
              >
                Alle als gelesen
              </button>
            </div>
            <div className="max-h-[min(60vh,20rem)] overflow-y-auto">
              {alertLoading ? (
                <p className="px-3 py-4 text-sm text-[#6b7280]">Lade …</p>
              ) : alerts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-[#6b7280]">Keine neuen Bestellungen seit dem letzten Zurücksetzen.</p>
              ) : (
                <ul>
                  {alerts.map((o) => (
                    <li key={o.id} className="border-b border-[#f3f4f6] last:border-b-0">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="block px-3 py-3 text-sm hover:bg-[#f7f8fa]"
                        onClick={() => {
                          setBellOpen(false);
                        }}
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
              )}
            </div>
            <div className="border-t border-[#f3f4f6] px-3 py-2">
              <Link
                href="/admin/orders"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setBellOpen(false)}
              >
                Alle Bestellungen
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
