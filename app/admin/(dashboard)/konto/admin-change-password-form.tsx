"use client";

import { useActionState, useCallback, useEffect, useId, useState, startTransition } from "react";
import { signOut } from "next-auth/react";
import { CustomerPasswordCriteriaIndicator } from "@/components/storefront/customer-password-criteria-indicator";
import { CUSTOMER_PASSWORD_MIN_LENGTH } from "@/features/customers/password";
import {
  changeAdminPasswordAction,
  type AdminKontoActionState,
} from "@/app/admin/(dashboard)/konto/actions";

const initial: AdminKontoActionState = null;

const inputClass =
  "w-full rounded-lg border border-[#d2d5d9] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const saveBtnClass =
  "min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50";

export function AdminChangePasswordForm() {
  const formId = useId();
  const [state, action, pending] = useActionState(changeAdminPasswordAction, initial);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const resetFields = useCallback(() => {
    setCurrentPassword("");
    setPassword("");
    setPasswordConfirm("");
  }, []);

  useEffect(() => {
    if (state?.ok) startTransition(() => resetFields());
  }, [state, resetFields]);

  useEffect(() => {
    if (state?.ok && state.requireReauth) {
      const timer = window.setTimeout(() => {
        void signOut({ callbackUrl: "/admin/login?passwordChanged=1" });
      }, 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [state]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${formId}-current`} className="mb-1.5 block text-sm font-medium text-[#1f2937]">
          Aktuelles Passwort <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-current`}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(state?.fieldErrors?.currentPassword)}
        />
        {state?.fieldErrors?.currentPassword ? (
          <p className="mt-1.5 text-sm text-[#b42318]" role="alert">
            {state.fieldErrors.currentPassword[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-[#1f2937]">
          Neues Passwort <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={CUSTOMER_PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(state?.fieldErrors?.password)}
          aria-describedby={`${formId}-password-criteria`}
        />
        {state?.fieldErrors?.password ? (
          <p className="mt-1.5 text-sm text-[#b42318]" role="alert">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
        <CustomerPasswordCriteriaIndicator password={password} id={`${formId}-password-criteria`} />
      </div>

      <div>
        <label
          htmlFor={`${formId}-password-confirm`}
          className="mb-1.5 block text-sm font-medium text-[#1f2937]"
        >
          Neues Passwort wiederholen <span className="text-primary">*</span>
        </label>
        <input
          id={`${formId}-password-confirm`}
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={CUSTOMER_PASSWORD_MIN_LENGTH}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(state?.fieldErrors?.passwordConfirm)}
        />
        {state?.fieldErrors?.passwordConfirm ? (
          <p className="mt-1.5 text-sm text-[#b42318]" role="alert">
            {state.fieldErrors.passwordConfirm[0]}
          </p>
        ) : null}
      </div>

      {state ? (
        <p
          className={state.ok ? "text-sm font-medium text-primary" : "text-sm text-[#b42318]"}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" className={saveBtnClass} disabled={pending}>
        {pending ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}
