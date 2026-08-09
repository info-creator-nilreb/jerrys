"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useActionState } from "react";
import {
  createWorkshopSessionSeriesAction,
  type WorkshopSessionActionState,
} from "@/app/admin/(dashboard)/termine/actions";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";
import type { AdminWorkshopSessionDetail } from "@/features/workshops";
import {
  durationMinutesFromSessionRange,
  workshopSessionDurationOptions,
} from "@/lib/workshop/admin-session-duration";
import { WORKSHOP_TIMEZONE_OPTIONS } from "@/lib/workshop/admin-datetime";
import {
  WORKSHOP_SESSION_SERIES_DEFAULT_ROW_COUNT,
  WORKSHOP_SESSION_SERIES_MAX_DATES,
} from "@/lib/workshop/workshop-series";

const initial: WorkshopSessionActionState = null;

const DEFAULT_DURATION_MINUTES = 120;

function eurosFromCents(cents: number): string {
  if (cents === 0) return "0";
  return (cents / 100).toFixed(2).replace(".", ",");
}

type Props = {
  /** Vorlage aus bestehendem Termin (ohne Termin-Daten in der Serie). */
  template?: AdminWorkshopSessionDetail | null;
};

export function WorkshopSessionSeriesForm({ template }: Props) {
  const [state, formAction, pending] = useActionState(createWorkshopSessionSeriesAction, initial);
  const fe = state?.ok === false ? state.fieldErrors : undefined;

  const timezone = template?.timezone ?? "Europe/Berlin";
  const durationDefault = template
    ? durationMinutesFromSessionRange(template.startsAt, template.endsAt)
    : DEFAULT_DURATION_MINUTES;
  const durationOptions = workshopSessionDurationOptions();

  const [rowIds, setRowIds] = useState(() =>
    Array.from({ length: WORKSHOP_SESSION_SERIES_DEFAULT_ROW_COUNT }, (_, i) => i),
  );
  const nextRowId = useRef(WORKSHOP_SESSION_SERIES_DEFAULT_ROW_COUNT);

  function addRow() {
    if (rowIds.length >= WORKSHOP_SESSION_SERIES_MAX_DATES) return;
    setRowIds((prev) => [...prev, nextRowId.current++]);
  }

  function removeRow(id: number) {
    setRowIds((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x !== id)));
  }

  return (
    <form action={formAction} className="space-y-8 pb-24">
      {state?.ok === false ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[#1f2937]">Workshop-Vorlage</h2>
        <p className="text-sm text-[#6b7280]">
          Titel, Ort, Preis und Kapazität gelten für alle Termine der Serie. Jeder Termin wird als eigener Entwurf
          angelegt.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Titel *</span>
          <input
            name="title"
            defaultValue={template?.title ?? ""}
            required
            className="w-full max-w-xl rounded-md border border-[#d1d5db] px-3 py-2"
          />
          {fe?.title ? <span className="mt-1 block text-xs text-red-600">{fe.title[0]}</span> : null}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Beschreibung</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={template?.description ?? ""}
            className="w-full max-w-2xl rounded-md border border-[#d1d5db] px-3 py-2"
          />
        </label>
      </section>

      <section className="space-y-4 lg:max-w-3xl">
        <h2 className="text-sm font-semibold text-[#1f2937]">Ort & Adresse</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Bezeichnung Ort *</span>
          <input
            name="locationLabel"
            defaultValue={template?.locationLabel ?? ""}
            required
            className="w-full max-w-xl rounded-md border border-[#d1d5db] px-3 py-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-[#374151]">Straße und Hausnummer *</span>
            <input
              name="locationLine1"
              defaultValue={template?.locationLine1 ?? ""}
              required
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-[#374151]">Adresszusatz</span>
            <input
              name="locationLine2"
              defaultValue={template?.locationLine2 ?? ""}
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">PLZ *</span>
            <input
              name="locationZip"
              defaultValue={template?.locationZip ?? ""}
              required
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Ort *</span>
            <input
              name="locationCity"
              defaultValue={template?.locationCity ?? ""}
              required
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-[#374151]">Land</span>
            <select
              name="locationCountry"
              defaultValue={template?.locationCountry ?? "DE"}
              className="w-full max-w-xs rounded-md border border-[#d1d5db] px-3 py-2"
            >
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Zeitzone</span>
          <select
            name="timezone"
            defaultValue={timezone}
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
          >
            {WORKSHOP_TIMEZONE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Dauer (alle Termine) *</span>
          <select
            name="durationMinutes"
            defaultValue={durationDefault}
            required
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
          >
            {durationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Preis pro Platz (EUR)</span>
          <input
            name="priceEuro"
            defaultValue={template ? eurosFromCents(template.priceCentsPerSeat) : "0"}
            inputMode="decimal"
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
          />
          <input type="hidden" name="currency" value="EUR" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Mindestteilnehmer</span>
          <input
            type="number"
            name="minimumParticipants"
            min={1}
            defaultValue={template?.minimumParticipants ?? 1}
            required
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Kapazität *</span>
          <input
            type="number"
            name="capacity"
            min={1}
            defaultValue={template?.capacity ?? 10}
            required
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Max. Plätze pro Buchung</span>
          <input
            type="number"
            name="maxSeatsPerBooking"
            min={1}
            defaultValue={template?.maxSeatsPerBooking ?? ""}
            placeholder="Optional"
            className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
          />
        </label>
      </section>

      <section className="space-y-4 lg:max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1f2937]">Termine in der Serie</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Pro Zeile ein Beginn — leere Zeilen werden ignoriert (max. {WORKSHOP_SESSION_SERIES_MAX_DATES}).
            </p>
          </div>
          <button
            type="button"
            disabled={rowIds.length >= WORKSHOP_SESSION_SERIES_MAX_DATES}
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            Zeile hinzufügen
          </button>
        </div>
        {fe?.seriesStartsAtLocal ? (
          <p className="text-sm text-red-700" role="alert">
            {fe.seriesStartsAtLocal[0]}
          </p>
        ) : null}
        <ul className="space-y-3">
          {rowIds.map((rowId, index) => (
            <li key={rowId} className="flex flex-wrap items-center gap-2">
              <label className="min-w-0 flex-1 text-sm">
                <span className="sr-only">Beginn Termin {index + 1}</span>
                <input
                  type="datetime-local"
                  name="seriesStartsAtLocal"
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
                />
              </label>
              {rowIds.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Termin-Zeile ${index + 1} entfernen`}
                  onClick={() => removeRow(rowId)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d1d5db] text-[#6b7280] hover:bg-[#f9fafb]"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <AdminFormActionDock>
        <Link
          href="/admin/termine"
          className="rounded-md border border-[#d1d5db] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
        >
          Abbrechen
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Lege Entwürfe an …" : "Serie als Entwürfe anlegen"}
        </button>
      </AdminFormActionDock>
    </form>
  );
}
