"use client";

import Link from "next/link";
import { User, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CustomerLoginForm } from "@/components/storefront/customer-login-form";
import {
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";
import { customerSignOutAction } from "@/app/(storefront)/konto/actions";

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const MAGIC_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  "magic-ungueltig": {
    ok: false,
    text: "Der Anmelde-Link ist ungültig.",
  },
  "magic-fehlgeschlagen": {
    ok: false,
    text: "Der Anmelde-Link ist ungültig oder abgelaufen. Bitte erneut anfordern.",
  },
  anmelden: {
    ok: true,
    text: "Melde dich mit Passwort oder Magic Link an.",
  },
};

type Props = {
  isLoggedIn: boolean;
  email: string | null;
};

export function HeaderAccountPopover({ isLoggedIn, email }: Props) {
  const panelId = useId();
  const [userOpen, setUserOpen] = useState(false);
  const [queryDismissed, setQueryDismissed] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const mounted = useClientMounted();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const kontoParam = searchParams.get("konto");
  const flash =
    kontoParam && MAGIC_MESSAGES[kontoParam] ? MAGIC_MESSAGES[kontoParam] : null;
  /**
   * Ziel nach dem Login hängt am Einstiegspunkt: Wer eine geschützte Seite angefordert hat
   * (`callbackUrl`), soll dort landen. Wer selbst im Header anmeldet, bleibt im Kontext.
   */
  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl =
    callbackUrlParam && callbackUrlParam.startsWith("/") ? callbackUrlParam : null;
  const wantsQueryOpen =
    !isLoggedIn &&
    (kontoParam === "anmelden" || Boolean(kontoParam?.startsWith("magic-")));
  const open = userOpen || (wantsQueryOpen && !queryDismissed);

  const clearKontoQuery = useCallback(() => {
    if (!kontoParam && !callbackUrlParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("konto");
    params.delete("callbackUrl");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [kontoParam, callbackUrlParam, searchParams, pathname, router]);

  const close = useCallback(() => {
    setUserOpen(false);
    setJustSignedIn(false);
    if (wantsQueryOpen) setQueryDismissed(true);
    clearKontoQuery();
  }, [wantsQueryOpen, clearKontoQuery]);

  // Anmeldung im Popover: Kontext bleibt erhalten, das Panel wechselt in den Konto-Zustand.
  const onSignedIn = useCallback(() => {
    setJustSignedIn(true);
    setUserOpen(true);
    setQueryDismissed(false);
    clearKontoQuery();
  }, [clearKontoQuery]);

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
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, close]);

  const overlay =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[600000]"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="absolute top-[calc(var(--storefront-header-height)+0.35rem)] right-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-(--surface-muted) bg-white p-4 shadow-lg sm:right-6 lg:right-8 xl:right-10"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2
              id={`${panelId}-title`}
              className="text-base font-semibold text-(--foreground-heading)"
            >
              {isLoggedIn ? "Mein Konto" : "Anmelden"}
            </h2>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading) transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Schließen"
              onClick={close}
            >
              <X className="size-6" aria-hidden strokeWidth={1.75} />
            </button>
          </div>

          {flash ? (
            <p
              className={
                flash.ok
                  ? "mb-3 text-sm text-(--foreground-muted)"
                  : "mb-3 text-sm text-red-600"
              }
              role={flash.ok ? "status" : "alert"}
            >
              {flash.text}
            </p>
          ) : null}

          {isLoggedIn ? (
            <div className="space-y-4">
              {justSignedIn ? (
                <p className="text-sm font-medium text-primary" role="status">
                  Anmeldung erfolgreich.
                </p>
              ) : null}
              <p className="text-sm text-(--foreground-muted)">
                Angemeldet als{" "}
                <span className="font-medium text-(--foreground-heading)">
                  {email ?? "Kunde"}
                </span>
              </p>
              <Link
                href="/konto"
                className={`${customerAuthPrimaryButtonClass} no-underline`}
                onClick={close}
              >
                Zum Konto
              </Link>
              <form action={customerSignOutAction}>
                <button
                  type="submit"
                  className="w-full text-center text-sm font-medium text-(--foreground-muted) underline-offset-2 hover:text-(--foreground-heading) hover:underline"
                >
                  Abmelden
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <CustomerLoginForm
                compact
                stayOnPage={!callbackUrl}
                callbackUrl={callbackUrl ?? "/konto"}
                onSignedIn={onSignedIn}
              />
              <p className="text-sm text-(--foreground-muted)">
                Neu hier?{" "}
                <Link
                  href="/konto/registrieren"
                  className={customerAuthSecondaryLinkClass}
                  onClick={close}
                >
                  Konto erstellen
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="relative z-[500001] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading) transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={isLoggedIn ? "Mein Konto" : "Anmelden"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setQueryDismissed(false);
          setUserOpen(true);
        }}
      >
        <User className="size-6" aria-hidden strokeWidth={1.75} />
      </button>
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
