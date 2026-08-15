"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { signOut } from "next-auth/react";
import { Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import {
  confirmAdminMfaSetupAction,
  disableAdminMfaAction,
  regenerateAdminMfaRecoveryAction,
  startAdminMfaSetupAction,
  type AdminKontoActionState,
} from "@/app/admin/(dashboard)/konto/actions";

const inputClass =
  "w-full rounded-lg border border-[#d2d5d9] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const primaryBtnClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50";

const secondaryBtnClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d2d5d9] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f4f5f7] disabled:cursor-not-allowed disabled:opacity-50";

const dangerBtnClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#f04438] bg-white px-4 py-2 text-sm font-medium text-[#b42318] transition-colors hover:bg-[#fef3f2] disabled:cursor-not-allowed disabled:opacity-50";

function StatusMessage({ state }: { state: AdminKontoActionState }) {
  if (!state) return null;
  return (
    <p
      className={state.ok ? "text-sm font-medium text-primary" : "text-sm text-[#b42318]"}
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function RecoveryCodesList({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-950">
        Wiederherstellungscodes — jetzt sichern. Sie werden nicht erneut angezeigt.
      </p>
      <ul className="mt-3 grid gap-1 font-mono text-sm text-[#1f2937] sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <button type="button" className={`${secondaryBtnClass} mt-3`} onClick={() => void copyAll()}>
        <Copy className="size-4" aria-hidden />
        {copied ? "Kopiert" : "Codes kopieren"}
      </button>
    </div>
  );
}

function SetupPanel({
  setup,
}: {
  setup: { secret: string; otpauthUrl: string; qrDataUrl: string };
}) {
  const formId = useId();
  const [state, action, pending] = useActionState(confirmAdminMfaSetupAction, null);
  const [copied, setCopied] = useState(false);

  if (state?.ok && state.recoveryCodes?.length) {
    return (
      <div className="space-y-3">
        <StatusMessage state={state} />
        <RecoveryCodesList codes={state.recoveryCodes} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6b7280]">
        Scanne den QR-Code mit einer Authenticator-App (z. B. Authy, 1Password, Google
        Authenticator) oder gib das Secret manuell ein.
      </p>
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {/* eslint-disable-next-line @next/next/no-img-element -- Data-URL aus Server-QR, kein Remote */}
        <img
          src={setup.qrDataUrl}
          alt="QR-Code für die Authenticator-App"
          width={192}
          height={192}
          className="size-48 rounded-lg border border-[#e8eaed] bg-white p-2"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-[#6b7280] uppercase">
            Manuelles Secret
          </p>
          <p className="mt-1 break-all font-mono text-sm text-[#1f2937]">{setup.secret}</p>
          <button
            type="button"
            className={`${secondaryBtnClass} mt-2`}
            onClick={() => {
              void navigator.clipboard.writeText(setup.secret).then(() => setCopied(true));
            }}
          >
            <Copy className="size-4" aria-hidden />
            {copied ? "Kopiert" : "Secret kopieren"}
          </button>
          <p className="sr-only">{setup.otpauthUrl}</p>
        </div>
      </div>
      <form action={action} className="space-y-3">
        <div>
          <label htmlFor={`${formId}-code`} className="mb-1.5 block text-sm font-medium text-[#1f2937]">
            Bestätigungscode <span className="text-primary">*</span>
          </label>
          <input
            id={`${formId}-code`}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={8}
            className={inputClass}
            aria-invalid={Boolean(state?.fieldErrors?.code)}
          />
          {state?.fieldErrors?.code ? (
            <p className="mt-1.5 text-sm text-[#b42318]" role="alert">
              {state.fieldErrors.code[0]}
            </p>
          ) : null}
        </div>
        <StatusMessage state={state} />
        <button type="submit" className={primaryBtnClass} disabled={pending}>
          <ShieldCheck className="size-4" aria-hidden />
          {pending ? "Wird geprüft…" : "MFA aktivieren"}
        </button>
      </form>
    </div>
  );
}

function EnabledPanel() {
  const formId = useId();
  const [disableState, disableAction, disablePending] = useActionState(
    disableAdminMfaAction,
    null,
  );
  const [regenState, regenAction, regenPending] = useActionState(
    regenerateAdminMfaRecoveryAction,
    null,
  );

  useEffect(() => {
    if (disableState?.ok && disableState.requireReauth) {
      const timer = window.setTimeout(() => {
        void signOut({ callbackUrl: "/admin/login?mfaDisabled=1" });
      }, 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [disableState]);

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <ShieldCheck className="size-4" aria-hidden />
        Zwei-Faktor-Authentifizierung ist aktiv.
      </p>

      {regenState?.ok && regenState.recoveryCodes?.length ? (
        <RecoveryCodesList codes={regenState.recoveryCodes} />
      ) : null}

      <form action={regenAction} className="space-y-3">
        <h3 className="text-sm font-semibold text-[#1f2937]">Neue Wiederherstellungscodes</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-regen-password`} className="mb-1.5 block text-sm text-[#1f2937]">
              Aktuelles Passwort <span className="text-primary">*</span>
            </label>
            <input
              id={`${formId}-regen-password`}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-regen-code`} className="mb-1.5 block text-sm text-[#1f2937]">
              TOTP oder Recovery-Code <span className="text-primary">*</span>
            </label>
            <input
              id={`${formId}-regen-code`}
              name="code"
              autoComplete="one-time-code"
              required
              className={inputClass}
            />
          </div>
        </div>
        <StatusMessage state={regenState} />
        <button type="submit" className={secondaryBtnClass} disabled={regenPending}>
          <KeyRound className="size-4" aria-hidden />
          {regenPending ? "Wird erzeugt…" : "Codes neu erzeugen"}
        </button>
      </form>

      <form action={disableAction} className="space-y-3 border-t border-[#e8eaed] pt-5">
        <h3 className="text-sm font-semibold text-[#1f2937]">MFA deaktivieren</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${formId}-disable-password`}
              className="mb-1.5 block text-sm text-[#1f2937]"
            >
              Aktuelles Passwort <span className="text-primary">*</span>
            </label>
            <input
              id={`${formId}-disable-password`}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-disable-code`} className="mb-1.5 block text-sm text-[#1f2937]">
              TOTP oder Recovery-Code <span className="text-primary">*</span>
            </label>
            <input
              id={`${formId}-disable-code`}
              name="code"
              autoComplete="one-time-code"
              required
              className={inputClass}
            />
          </div>
        </div>
        <StatusMessage state={disableState} />
        <button type="submit" className={dangerBtnClass} disabled={disablePending}>
          <ShieldOff className="size-4" aria-hidden />
          {disablePending ? "Wird deaktiviert…" : "MFA deaktivieren"}
        </button>
      </form>
    </div>
  );
}

export function AdminMfaCard({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [startState, startAction, startPending] = useActionState(
    startAdminMfaSetupAction,
    null,
  );

  if (mfaEnabled) {
    return <EnabledPanel />;
  }

  if (startState?.ok && startState.setup) {
    return <SetupPanel setup={startState.setup} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6b7280]">
        Schütze den Admin-Zugang mit einem zeitbasierten Code aus einer Authenticator-App.
        Ohne MFA reicht das Passwort.
      </p>
      <StatusMessage state={startState} />
      <form action={startAction}>
        <button type="submit" className={primaryBtnClass} disabled={startPending}>
          <ShieldCheck className="size-4" aria-hidden />
          {startPending ? "Wird vorbereitet…" : "MFA einrichten"}
        </button>
      </form>
    </div>
  );
}
