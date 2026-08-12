"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { bulkPublishWorkshopSessionsAction } from "@/app/admin/(dashboard)/termine/actions";
import { WorkshopSessionStatusBadge } from "@/components/admin/workshops/workshop-session-status-badge";
import type { AdminWorkshopSessionListItem } from "@/features/workshops";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";

export function WorkshopSessionAdminList({ sessions }: { sessions: AdminWorkshopSessionListItem[] }) {
  const draftSessions = useMemo(() => sessions.filter((s) => s.status === "draft"), [sessions]);
  const draftIds = useMemo(() => new Set(draftSessions.map((s) => s.id)), [draftSessions]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedDraftCount = [...selected].filter((id) => draftIds.has(id)).length;
  const allDraftsSelected =
    draftSessions.length > 0 && draftSessions.every((s) => selected.has(s.id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllDrafts(checked: boolean) {
    setSelected(checked ? new Set(draftSessions.map((s) => s.id)) : new Set());
  }

  function publishSelected() {
    const ids = [...selected].filter((id) => draftIds.has(id));
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await bulkPublishWorkshopSessionsAction(ids);
      if (result && !result.ok) setError(result.message);
    });
  }

  return (
    <div className="space-y-3">
      {draftSessions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
          <p className="text-sm text-[#374151]">
            {selectedDraftCount > 0
              ? `${selectedDraftCount} Entwurf/Entwürfe ausgewählt`
              : "Entwürfe auswählen für Bulk-Veröffentlichen"}
          </p>
          <button
            type="button"
            disabled={pending || selectedDraftCount === 0}
            onClick={publishSelected}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
          >
            {pending ? "Veröffentliche …" : "Auswahl veröffentlichen"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3 md:hidden">
        {sessions.map((s) => {
          const isDraft = s.status === "draft";
          return (
            <li
              key={s.id}
              className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {isDraft ? (
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    aria-label={`${s.title} auswählen`}
                    onChange={(e) => toggleOne(s.id, e.target.checked)}
                    className="mt-1 size-5 rounded border-[#d1d5db]"
                    disabled={pending}
                  />
                ) : (
                  <span className="mt-1 size-5 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-[#1f2937]">{s.title}</p>
                    <WorkshopSessionStatusBadge status={s.status} label={s.statusLabel} />
                  </div>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {formatWorkshopSessionDateTime(s.startsAt, s.timezone)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6b7280]">{s.locationLabel}</p>
                  <p className="mt-1 text-xs tabular-nums text-[#6b7280]">
                    {s.confirmedSeatCount + s.heldSeatCount}/{s.capacity} Plätze
                  </p>
                  <Link
                    href={`/admin/termine/${s.id}/edit`}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                  >
                    Bearbeiten
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
            <tr>
              <th className="w-10 px-3 py-3">
                {draftSessions.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allDraftsSelected}
                    aria-label="Alle Entwürfe auswählen"
                    onChange={(e) => toggleAllDrafts(e.target.checked)}
                    className="size-4 rounded border-[#d1d5db]"
                  />
                ) : null}
              </th>
              <th className="px-4 py-3 font-medium">Titel</th>
              <th className="px-4 py-3 font-medium">Beginn</th>
              <th className="px-4 py-3 font-medium">Ort</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Plätze</th>
              <th className="px-4 py-3 font-medium text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8eaed]">
            {sessions.map((s) => {
              const isDraft = s.status === "draft";
              return (
                <tr key={s.id} className="bg-white">
                  <td className="px-3 py-3">
                    {isDraft ? (
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        aria-label={`${s.title} auswählen`}
                        onChange={(e) => toggleOne(s.id, e.target.checked)}
                        className="size-4 rounded border-[#d1d5db]"
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1f2937]">{s.title}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#6b7280]">
                    {formatWorkshopSessionDateTime(s.startsAt, s.timezone)}
                  </td>
                  <td className="px-4 py-3 text-[#6b7280]">{s.locationLabel}</td>
                  <td className="px-4 py-3">
                    <WorkshopSessionStatusBadge status={s.status} label={s.statusLabel} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#374151]">
                    {s.confirmedSeatCount + s.heldSeatCount}/{s.capacity}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/termine/${s.id}/edit`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Bearbeiten
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
