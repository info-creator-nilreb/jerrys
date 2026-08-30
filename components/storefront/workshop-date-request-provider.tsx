"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { WorkshopDateRequestForm } from "@/components/storefront/workshop-date-request-form";
import {
  WORKSHOP_DATE_REQUEST_SUCCESS_MESSAGE,
  WorkshopDateRequestIntro,
} from "@/components/storefront/workshop-date-request-intro";
import type { WorkshopDateRequestSeatGuidance } from "@/lib/workshop/workshop-date-request-limits";

type OpenContextValue = {
  openRequest: () => void;
};

const OpenContext = createContext<OpenContextValue | null>(null);

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type ProviderProps = {
  children: ReactNode;
  defaultEmail?: string;
  defaultName?: string;
  seatGuidance: WorkshopDateRequestSeatGuidance;
};

export function WorkshopDateRequestProvider({
  children,
  defaultEmail = "",
  defaultName = "",
  seatGuidance,
}: ProviderProps) {
  const panelId = useId();
  const formInstanceId = useId();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const mounted = useClientMounted();

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => {
      setSuccess(false);
      setFormKey((k) => k + 1);
    }, 200);
  }, []);

  const openRequest = useCallback(() => {
    setSuccess(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const overlay =
    open && mounted ? (
      <div className="fixed inset-0 z-[600000] flex items-end justify-center md:items-center md:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label="Wunschtermin schließen"
          onClick={close}
        />
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="relative z-[600001] flex max-h-[min(92vh,44rem)] w-full flex-col rounded-t-2xl border border-(--surface-muted) bg-white shadow-2xl md:max-h-[min(90vh,40rem)] md:max-w-lg md:rounded-xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-(--surface-muted) px-4 py-4 md:px-6">
            <div className="min-w-0 pr-2">
              <h2
                id={`${panelId}-title`}
                className="text-lg font-semibold tracking-tight text-(--foreground-heading)"
              >
                Wunschtermin anfragen
              </h2>
              {!success ? (
                <div className="mt-2">
                  <WorkshopDateRequestIntro compact />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Schließen"
              onClick={close}
            >
              <X className="size-5" aria-hidden strokeWidth={1.75} />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            {success ? (
              <div className="space-y-4">
                <p
                  className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
                  role="status"
                >
                  {WORKSHOP_DATE_REQUEST_SUCCESS_MESSAGE}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-(--surface-muted) bg-white px-4 text-sm font-semibold text-(--foreground-heading) hover:bg-(--surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <WorkshopDateRequestForm
                key={`${formInstanceId}-${formKey}`}
                idPrefix={`overlay-${formKey}-`}
                defaultEmail={defaultEmail}
                defaultName={defaultName}
                delivery="inline"
                onSuccess={() => setSuccess(true)}
                seatGuidance={seatGuidance}
              />
            )}

            {!success ? (
              <p className="mt-6 border-t border-(--surface-muted) pt-4 text-center text-xs text-(--foreground-muted)">
                <Link href="/termine/wunschtermin" className="font-medium text-primary hover:underline">
                  Formular als eigene Seite öffnen
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <OpenContext.Provider value={{ openRequest }}>
      {children}
      {overlay ? createPortal(overlay, document.body) : null}
    </OpenContext.Provider>
  );
}

export function useWorkshopDateRequestOpen(): OpenContextValue {
  const ctx = useContext(OpenContext);
  if (!ctx) {
    throw new Error("useWorkshopDateRequestOpen must be used within WorkshopDateRequestProvider");
  }
  return ctx;
}

type TriggerProps = {
  children?: ReactNode;
  className?: string;
  variant?: "link" | "button";
};

export function WorkshopDateRequestTrigger({
  children,
  className,
  variant = "link",
}: TriggerProps) {
  const { openRequest } = useWorkshopDateRequestOpen();
  const label = children ?? "Wunschtermin anfragen";

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={openRequest}
        className={
          className ??
          "inline-flex min-h-11 items-center justify-center rounded-md border border-(--surface-muted) bg-white px-4 text-sm font-semibold text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        }
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openRequest}
      className={
        className ??
        "font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      }
    >
      {label}
    </button>
  );
}

export function WorkshopDateRequestEmptyHint() {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-(--foreground-muted)">Kein passender Termin dabei?</p>
      <WorkshopDateRequestTrigger variant="button">Wunschtermin anfragen</WorkshopDateRequestTrigger>
    </div>
  );
}
