"use client";

import { useActionState, useId } from "react";
import {
  saveShopWorkshopSettingsAction,
  type WorkshopSessionActionState,
} from "@/app/admin/(dashboard)/termine/actions";
import {
  ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING,
  AdminFormActionDock,
} from "@/components/admin/admin-form-action-dock";

const initial: WorkshopSessionActionState = null;

export function WorkshopGlobalSettingsForm({
  defaults,
  disabled = false,
}: {
  defaults: { selfCancelHoursBeforeStart: number };
  disabled?: boolean;
}) {
  const formId = useId();
  const [state, action, pending] = useActionState(saveShopWorkshopSettingsAction, initial);

  return (
    <div className={ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING}>
      <form
        id={formId}
        action={action}
        className="rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-4"
      >
        <h2 className="text-sm font-semibold text-[#1f2937]">Shopweite Storno-Frist</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Standard für Selbststornierung durch Kunden (Stunden vor Terminbeginn). Pro Termin optional
          überschreibbar.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block text-sm text-[#374151]">
            <span className="mb-1 block font-medium">Stunden vor Beginn</span>
            <input
              type="number"
              name="selfCancelHoursBeforeStart"
              min={0}
              defaultValue={defaults.selfCancelHoursBeforeStart}
              className="w-28 rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
              required
              disabled={disabled}
            />
          </label>
        </div>
        {state?.ok === true && state.message ? (
          <p className="mt-3 text-sm text-green-800" role="status">
            {state.message}
          </p>
        ) : null}
        {state?.ok === false ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>

      {!disabled ? (
        <AdminFormActionDock>
          {state?.ok === true && state.message ? (
            <p className="mr-auto text-sm font-medium text-primary" role="status">
              {state.message}
            </p>
          ) : state?.ok === false ? (
            <p className="mr-auto text-sm text-red-700" role="alert">
              {state.message}
            </p>
          ) : (
            <span className="mr-auto hidden text-sm text-[#6b7280] sm:inline">
              Storno-Frist speichern.
            </span>
          )}
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
          >
            {pending ? "Speichern …" : "Speichern"}
          </button>
        </AdminFormActionDock>
      ) : null}
    </div>
  );
}
