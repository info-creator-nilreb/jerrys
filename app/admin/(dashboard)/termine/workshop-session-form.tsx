"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  saveWorkshopSessionDraftAction,
  type WorkshopSessionActionState,
} from "@/app/admin/(dashboard)/termine/actions";
import {
  ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING,
  AdminFormActionDock,
} from "@/components/admin/admin-form-action-dock";
import type { AdminWorkshopSessionDetail } from "@/features/workshops";
import { formatDurationLabel } from "@/lib/workshop/duration-format";
import {
  formatWorkshopSessionLocationBlock,
} from "@/lib/workshop/workshop-location";
import {
  durationMinutesFromSessionRange,
  workshopSessionDurationOptions,
} from "@/lib/workshop/admin-session-duration";
import {
  WORKSHOP_TIMEZONE_OPTIONS,
  formatLocalDateTimeInTimeZone,
} from "@/lib/workshop/admin-datetime";
import {
  WORKSHOP_ADMIN_FIELD,
  WORKSHOP_ADMIN_FIELD_GRID,
  WORKSHOP_ADMIN_FIELD_READ_ONLY,
  WORKSHOP_ADMIN_FORM_SINGLE_COL,
  WORKSHOP_ADMIN_FORM_TWO_COL,
} from "@/lib/workshop/admin-form-fields";

const initial: WorkshopSessionActionState = null;

const DEFAULT_NEW_SESSION_DURATION_MINUTES = 120;

function formatSessionDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function eurosFromCents(cents: number): string {
  if (cents === 0) return "0";
  return (cents / 100).toFixed(2).replace(".", ",");
}

type Props = {
  session?: AdminWorkshopSessionDetail;
  readOnly?: boolean;
};

export function WorkshopSessionForm({ session, readOnly = false }: Props) {
  const [state, formAction, pending] = useActionState(saveWorkshopSessionDraftAction, initial);
  const fe = state?.ok === false ? state.fieldErrors : undefined;

  const timezone = session?.timezone ?? "Europe/Berlin";
  const startsDefault = session
    ? formatLocalDateTimeInTimeZone(session.startsAt, timezone)
    : "";
  const durationDefault = session
    ? durationMinutesFromSessionRange(session.startsAt, session.endsAt)
    : DEFAULT_NEW_SESSION_DURATION_MINUTES;
  const durationOptions = workshopSessionDurationOptions();

  return (
    <form action={formAction} className={`space-y-8 ${ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING}`}>
      {session?.id ? <input type="hidden" name="id" value={session.id} /> : null}

      {state?.ok === false ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      <section className={`space-y-4 ${WORKSHOP_ADMIN_FORM_SINGLE_COL}`}>
        <h2 className="text-sm font-semibold text-[#1f2937]">Termin</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Titel *</span>
          <input
            name="title"
            defaultValue={session?.title ?? ""}
            readOnly={readOnly}
            required
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
          {fe?.title ? <span className="mt-1 block text-xs text-red-600">{fe.title[0]}</span> : null}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Beschreibung</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={session?.description ?? ""}
            readOnly={readOnly}
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
        </label>
      </section>

      <section className={`space-y-4 ${WORKSHOP_ADMIN_FORM_SINGLE_COL}`}>
        <h2 className="text-sm font-semibold text-[#1f2937]">Ort & Adresse</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Bezeichnung Ort *</span>
          <input
            name="locationLabel"
            defaultValue={session?.locationLabel ?? ""}
            readOnly={readOnly}
            required
            placeholder="z. B. Werkstatt Berlin-Mitte"
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
          <span className="mt-1 block text-xs text-[#6b7280]">Kurzname für Listen.</span>
          {fe?.locationLabel ? (
            <span className="mt-1 block text-xs text-red-600">{fe.locationLabel[0]}</span>
          ) : null}
        </label>
        {readOnly && session ? (
          <div className="text-sm text-[#374151]">
            {(() => {
              const block = formatWorkshopSessionLocationBlock({
                locationLabel: session.locationLabel,
                locationLine1: session.locationLine1,
                locationLine2: session.locationLine2,
                locationZip: session.locationZip,
                locationCity: session.locationCity,
                locationCountry: session.locationCountry,
              });
              return block.addressLines.length > 0 ? (
                <address className="not-italic">
                  {block.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                <p className="text-[#6b7280]">Keine Straßenadresse hinterlegt.</p>
              );
            })()}
          </div>
        ) : (
          <div className={`${WORKSHOP_ADMIN_FIELD_GRID}`}>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-[#374151]">Straße und Hausnummer *</span>
              <input
                name="locationLine1"
                defaultValue={session?.locationLine1 ?? ""}
                required
                className={WORKSHOP_ADMIN_FIELD}
              />
              {fe?.locationLine1 ? (
                <span className="mt-1 block text-xs text-red-600">{fe.locationLine1[0]}</span>
              ) : null}
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-[#374151]">Adresszusatz</span>
              <input
                name="locationLine2"
                defaultValue={session?.locationLine2 ?? ""}
                placeholder="Optional"
                className={WORKSHOP_ADMIN_FIELD}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[#374151]">PLZ *</span>
              <input
                name="locationZip"
                defaultValue={session?.locationZip ?? ""}
                required
                className={WORKSHOP_ADMIN_FIELD}
              />
              {fe?.locationZip ? (
                <span className="mt-1 block text-xs text-red-600">{fe.locationZip[0]}</span>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[#374151]">Ort *</span>
              <input
                name="locationCity"
                defaultValue={session?.locationCity ?? ""}
                required
                className={WORKSHOP_ADMIN_FIELD}
              />
              {fe?.locationCity ? (
                <span className="mt-1 block text-xs text-red-600">{fe.locationCity[0]}</span>
              ) : null}
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-[#374151]">Land</span>
              <select
                name="locationCountry"
                defaultValue={session?.locationCountry ?? "DE"}
                className={WORKSHOP_ADMIN_FIELD}
              >
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
              </select>
            </label>
          </div>
        )}
      </section>

      <section className={`${WORKSHOP_ADMIN_FIELD_GRID} ${WORKSHOP_ADMIN_FORM_TWO_COL}`}>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-[#374151]">Zeitzone</span>
          <select
            name="timezone"
            defaultValue={timezone}
            disabled={readOnly}
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          >
            {WORKSHOP_TIMEZONE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Beginn *</span>
          {readOnly && session ? (
            <p className="text-[#1f2937]">{formatSessionDateTime(session.startsAt, timezone)}</p>
          ) : (
            <input
              type="datetime-local"
              name="startsAtLocal"
              defaultValue={startsDefault}
              required
              className={WORKSHOP_ADMIN_FIELD}
            />
          )}
          {fe?.startsAtLocal ? (
            <span className="mt-1 block text-xs text-red-600">{fe.startsAtLocal[0]}</span>
          ) : null}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Dauer *</span>
          {readOnly && session ? (
            <p className="text-[#1f2937]">
              {formatDurationLabel(durationDefault)}
              <span className="mt-1 block text-sm text-[#6b7280]">
                Ende: {formatSessionDateTime(session.endsAt, timezone)}
              </span>
            </p>
          ) : (
            <>
              <select
                name="durationMinutes"
                defaultValue={durationDefault}
                required
                className={WORKSHOP_ADMIN_FIELD}
              >
                {durationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#6b7280]">
                Ende wird aus Beginn und Dauer berechnet (30-Min-Schritte).
              </span>
            </>
          )}
          {fe?.durationMinutes ? (
            <span className="mt-1 block text-xs text-red-600">{fe.durationMinutes[0]}</span>
          ) : null}
        </label>
      </section>

      <section className={`${WORKSHOP_ADMIN_FIELD_GRID} ${WORKSHOP_ADMIN_FORM_TWO_COL}`}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Preis pro Platz (EUR)</span>
          <input
            name="priceEuro"
            defaultValue={session ? eurosFromCents(session.priceCentsPerSeat) : "0"}
            readOnly={readOnly}
            inputMode="decimal"
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
          <input type="hidden" name="currency" value="EUR" />
          {fe?.priceEuro ? <span className="mt-1 block text-xs text-red-600">{fe.priceEuro[0]}</span> : null}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Mindestteilnehmer (gesamt)</span>
          <input
            type="number"
            name="minimumParticipants"
            min={1}
            defaultValue={session?.minimumParticipants ?? 1}
            readOnly={readOnly}
            required
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Kapazität (max. Plätze) *</span>
          <input
            type="number"
            name="capacity"
            min={1}
            defaultValue={session?.capacity ?? 10}
            readOnly={readOnly}
            required
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
          {fe?.capacity ? <span className="mt-1 block text-xs text-red-600">{fe.capacity[0]}</span> : null}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Max. Plätze pro Buchung</span>
          <input
            type="number"
            name="maxSeatsPerBooking"
            min={1}
            defaultValue={session?.maxSeatsPerBooking ?? ""}
            readOnly={readOnly}
            placeholder="Optional"
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-[#374151]">
            Eigene Storno-Frist (Stunden vor Beginn)
          </span>
          <input
            type="number"
            name="selfCancelHoursBeforeStart"
            min={0}
            defaultValue={session?.selfCancelHoursBeforeStart ?? ""}
            readOnly={readOnly}
            placeholder="Leer = Shop-Default"
            className={readOnly ? WORKSHOP_ADMIN_FIELD_READ_ONLY : WORKSHOP_ADMIN_FIELD}
          />
        </label>
      </section>

      {!readOnly ? (
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
            {pending ? "Speichern …" : session ? "Entwurf speichern" : "Entwurf anlegen"}
          </button>
        </AdminFormActionDock>
      ) : null}
    </form>
  );
}
