"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  customerPasswordLoginAction,
  requestMagicLinkAction,
  type CustomerAuthActionState,
} from "@/app/(storefront)/konto/actions";
import {
  customerAuthInputClass,
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";

const initial: CustomerAuthActionState = null;

export function CustomerLoginForm({
  callbackUrl = "/konto",
  compact = false,
  stayOnPage = false,
  onSignedIn,
}: {
  callbackUrl?: string;
  compact?: boolean;
  /** Kein Seitenwechsel nach dem Login (Header-Popover): nur Server-Zustand neu laden. */
  stayOnPage?: boolean;
  onSignedIn?: () => void;
}) {
  const formId = useId();
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [passwordState, passwordAction, passwordPending] = useActionState(
    customerPasswordLoginAction,
    initial,
  );
  const [magicState, magicAction, magicPending] = useActionState(requestMagicLinkAction, initial);
  const signedInHandledRef = useRef(false);

  useEffect(() => {
    if (!stayOnPage) return;
    if (!passwordState?.ok || signedInHandledRef.current) return;
    signedInHandledRef.current = true;
    router.refresh();
    onSignedIn?.();
  }, [stayOnPage, passwordState, router, onSignedIn]);

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className="flex gap-2 border-b border-(--surface-muted) pb-3 text-sm">
        <button
          type="button"
          className={
            mode === "password"
              ? "font-semibold text-primary"
              : "text-(--foreground-muted) hover:text-(--foreground-heading)"
          }
          onClick={() => setMode("password")}
          aria-pressed={mode === "password"}
        >
          Passwort
        </button>
        <span className="text-(--foreground-muted)" aria-hidden>
          ·
        </span>
        <button
          type="button"
          className={
            mode === "magic"
              ? "font-semibold text-primary"
              : "text-(--foreground-muted) hover:text-(--foreground-heading)"
          }
          onClick={() => setMode("magic")}
          aria-pressed={mode === "magic"}
        >
          Magic Link
        </button>
      </div>

      {mode === "password" ? (
        <form action={passwordAction} className="space-y-4" noValidate>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          {stayOnPage ? <input type="hidden" name="stayOnPage" value="1" /> : null}
          <div>
            <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
              E-Mail <span className="text-primary">*</span>
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              className={customerAuthInputClass}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor={`${formId}-password`}
                className="block text-sm font-medium text-(--foreground-heading)"
              >
                Passwort <span className="text-primary">*</span>
              </label>
              <Link href="/konto/passwort-vergessen" className={customerAuthSecondaryLinkClass}>
                Vergessen?
              </Link>
            </div>
            <input
              id={`${formId}-password`}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={customerAuthInputClass}
            />
          </div>
          {passwordState && !passwordState.ok ? (
            <p className="text-sm text-red-600" role="alert">
              {passwordState.message}
            </p>
          ) : null}
          <button type="submit" className={customerAuthPrimaryButtonClass} disabled={passwordPending}>
            {passwordPending ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>
      ) : (
        <form action={magicAction} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor={`${formId}-magic-email`}
              className="mb-1.5 block text-sm font-medium text-(--foreground-heading)"
            >
              E-Mail <span className="text-primary">*</span>
            </label>
            <input
              id={`${formId}-magic-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              className={customerAuthInputClass}
            />
          </div>
          {magicState ? (
            <p
              className={magicState.ok ? "text-sm font-medium text-primary" : "text-sm text-red-600"}
              role={magicState.ok ? "status" : "alert"}
            >
              {magicState.message}
            </p>
          ) : (
            <p className="text-sm text-(--foreground-muted)">
              Wir senden dir einen einmaligen Link zur Anmeldung.
            </p>
          )}
          <button type="submit" className={customerAuthPrimaryButtonClass} disabled={magicPending}>
            {magicPending ? "Wird gesendet…" : "Magic Link senden"}
          </button>
        </form>
      )}
    </div>
  );
}
