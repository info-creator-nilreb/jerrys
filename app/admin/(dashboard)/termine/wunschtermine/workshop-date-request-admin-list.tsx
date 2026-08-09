"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  approveWorkshopDateRequestAction,
  rejectWorkshopDateRequestAction,
  type WorkshopDateRequestAdminActionState,
} from "@/app/admin/(dashboard)/termine/wunschtermine/actions";
import type { AdminWorkshopDateRequestListItem } from "@/features/workshops";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";
import { Check, X } from "lucide-react";

const initial: WorkshopDateRequestAdminActionState = null;

function RequestRow({ item }: { item: AdminWorkshopDateRequestListItem }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveWorkshopDateRequestAction,
    initial,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectWorkshopDateRequestAction,
    initial,
  );

  const when = formatWorkshopSessionDateTime(item.preferredStartsAt, "Europe/Berlin");
  const pending = item.status === "pending";

  return (
    <article className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1f2937]">
            {item.contactName?.trim() || "Ohne Name"}{" "}
            <span className="font-normal text-[#6b7280]">&lt;{item.contactEmail}&gt;</span>
          </p>
          <p className="mt-1 text-sm text-[#374151]">
            Wunsch: <time dateTime={item.preferredStartsAt.toISOString()}>{when}</time>
            {" · "}
            {item.seatCount} {item.seatCount === 1 ? "Platz" : "Plätze"}
          </p>
        </div>
        <span
          className={
            item.status === "pending"
              ? "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900"
              : item.status === "approved"
                ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-900"
                : "rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#374151]"
          }
        >
          {item.statusLabel}
        </span>
      </div>

      {item.message ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[#4b5563]">{item.message}</p>
      ) : null}

      {item.adminNote ? (
        <p className="mt-2 text-sm text-[#6b7280]">
          <span className="font-medium">Admin:</span> {item.adminNote}
        </p>
      ) : null}

      {item.approvedSessionId ? (
        <p className="mt-3 text-sm">
          <Link
            href={`/admin/termine/${item.approvedSessionId}/edit`}
            className="font-medium text-primary hover:underline"
          >
            Entwurf-Termin bearbeiten
          </Link>
        </p>
      ) : null}

      {(approveState?.ok === false && approveState.message) ||
      (rejectState?.ok === false && rejectState.message) ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {approveState?.ok === false ? approveState.message : rejectState?.ok === false ? rejectState.message : null}
        </p>
      ) : null}

      {rejectState?.ok === true && rejectState.message ? (
        <p className="mt-3 text-sm text-green-800" role="status">
          {rejectState.message}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#f3f4f6] pt-4">
          <form action={approveAction}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              disabled={approvePending || rejectPending}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
            >
              <Check className="size-4" aria-hidden />
              Bestätigen & Entwurf anlegen
            </button>
          </form>

          <form action={rejectAction} className="flex flex-1 flex-wrap items-end gap-2 min-w-[200px]">
            <input type="hidden" name="id" value={item.id} />
            <label className="sr-only" htmlFor={`adminNote-${item.id}`}>
              Ablehnungsgrund (optional)
            </label>
            <input
              id={`adminNote-${item.id}`}
              name="adminNote"
              type="text"
              placeholder="Ablehnungsgrund (optional)"
              className="min-h-10 flex-1 rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={approvePending || rejectPending}
              aria-label="Anfrage ablehnen"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
            >
              <X className="size-4" aria-hidden />
              Ablehnen
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

type Props = {
  requests: AdminWorkshopDateRequestListItem[];
};

export function WorkshopDateRequestAdminList({ requests }: Props) {
  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#e5e7eb] bg-[#fafbfc] px-6 py-12 text-center text-sm text-[#6b7280]">
        Keine Wunschtermine.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {requests.map((item) => (
        <li key={item.id}>
          <RequestRow item={item} />
        </li>
      ))}
    </ul>
  );
}
