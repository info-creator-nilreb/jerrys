"use client";

import { useEffect } from "react";
import type { CustomerAuthActionState } from "@/app/(storefront)/konto/actions";

/** Leert Passwort-Felder nach Server-Fehlern; Name/E-Mail bleiben erhalten. */
export function useResetPasswordFieldsOnServerError(
  state: CustomerAuthActionState,
  reset: () => void,
): void {
  useEffect(() => {
    if (!state?.fieldErrors) return;
    if (
      state.fieldErrors.password ||
      state.fieldErrors.passwordConfirm ||
      state.fieldErrors.currentPassword
    ) {
      reset();
    }
  }, [state, reset]);
}
