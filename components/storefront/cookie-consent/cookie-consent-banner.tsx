"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/consent/constants";
import { buildConsentRecord, hasValidConsentRecord, readConsentFromWindow, writeConsentToWindow } from "@/lib/consent/storage";

type View = "choice" | "granular";

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function CookieConsentBanner() {
  const titleId = useId();
  const mounted = useClientMounted();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("choice");
  const [statistics, setStatistics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const syncOpenFromStorage = useCallback(() => {
    if (!hasValidConsentRecord()) {
      setView("choice");
      setOpen(true);
      return;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      syncOpenFromStorage();
    });
  }, [mounted, syncOpenFromStorage]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const onOpenSettings = () => {
      const existing = readConsentFromWindow();
      setStatistics(existing?.statistics ?? false);
      setMarketing(existing?.marketing ?? false);
      setView("granular");
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
  }, [mounted]);

  const persist = useCallback((stats: boolean, mkt: boolean) => {
    writeConsentToWindow(buildConsentRecord({ statistics: stats, marketing: mkt }));
    setOpen(false);
    setView("choice");
  }, []);

  const acceptAll = useCallback(() => persist(true, true), [persist]);
  const acceptNecessary = useCallback(() => persist(false, false), [persist]);
  const saveGranular = useCallback(() => persist(statistics, marketing), [persist, statistics, marketing]);

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label={
          hasValidConsentRecord() ? "Cookie-Einstellungen schließen" : "Nur notwendige Cookies übernehmen"
        }
        onClick={() => {
          if (!hasValidConsentRecord()) {
            acceptNecessary();
          } else {
            const ex = readConsentFromWindow();
            setStatistics(ex?.statistics ?? false);
            setMarketing(ex?.marketing ?? false);
            setView("choice");
            setOpen(false);
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[201] w-full max-w-lg rounded-xl border border-(--surface-muted) bg-white p-5 shadow-2xl sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold text-(--foreground-heading)">
          {view === "choice" ? "Cookies und Einwilligung" : "Cookie-Einstellungen"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-(--foreground-muted)">
          Wir verwenden Cookies und ähnliche Technologien. Notwendige Cookies sind für den Shopbetrieb erforderlich.
          Statistik und Marketing sind optional und werden nur mit eurer Einwilligung aktiviert (derzeit werden keine
          entsprechenden Drittanbieter-Skripte geladen – die Auswahl ist für spätere Erweiterungen gespeichert). Details
          in der{" "}
          <Link href="/datenschutz" className="font-medium text-primary underline-offset-2 hover:underline">
            Datenschutzerklärung
          </Link>
          .
        </p>

        {view === "choice" ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="order-3 rounded-md border border-(--surface-muted) px-4 py-2.5 text-sm font-medium text-(--foreground-heading) hover:bg-(--surface-soft) sm:order-1"
              onClick={() => {
                setStatistics(false);
                setMarketing(false);
                setView("granular");
              }}
            >
              Einstellungen
            </button>
            <button
              type="button"
              className="order-2 rounded-md border border-(--surface-muted) px-4 py-2.5 text-sm font-medium text-(--foreground-heading) hover:bg-(--surface-soft) sm:order-2"
              onClick={acceptNecessary}
            >
              Nur notwendige
            </button>
            <button
              type="button"
              className="order-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) sm:order-3"
              onClick={acceptAll}
            >
              Alle akzeptieren
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-(--foreground-heading)">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-(--surface-muted) text-primary focus:ring-primary/30"
                checked={statistics}
                onChange={(e) => setStatistics(e.target.checked)}
              />
              <span>
                <span className="font-medium">Statistik</span>
                <span className="mt-0.5 block text-(--foreground-muted)">
                  Anonymisierte Nutzungsauswertung (wenn ein Tool eingebunden ist).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-(--foreground-heading)">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-(--surface-muted) text-primary focus:ring-primary/30"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <span className="font-medium">Marketing</span>
                <span className="mt-0.5 block text-(--foreground-muted)">
                  Personalisierte Werbung (wenn eingebunden).
                </span>
              </span>
            </label>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-(--surface-muted) px-4 py-2.5 text-sm font-medium text-(--foreground-heading) hover:bg-(--surface-soft)"
                onClick={() => {
                  if (!hasValidConsentRecord()) {
                    setView("choice");
                    return;
                  }
                  const ex = readConsentFromWindow();
                  setStatistics(ex?.statistics ?? false);
                  setMarketing(ex?.marketing ?? false);
                  setView("choice");
                  setOpen(false);
                }}
              >
                {!hasValidConsentRecord() ? "Zurück" : "Abbrechen"}
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
                onClick={saveGranular}
              >
                Speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
