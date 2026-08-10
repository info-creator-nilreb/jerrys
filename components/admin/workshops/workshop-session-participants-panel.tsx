"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminWorkshopBookingListItem } from "@/features/workshops";
import {
  adminCancelWorkshopBookingAction,
  setWorkshopBookingAttendanceAction,
} from "@/app/admin/(dashboard)/termine/participant-actions";

type Props = {
  sessionId: string;
  bookings: AdminWorkshopBookingListItem[];
  participation: {
    meetsMinimum: boolean;
    minimumParticipants: number;
    confirmedSeatCount: number;
    capacity: number;
  };
};

export function WorkshopSessionParticipantsPanel({
  sessionId,
  bookings,
  participation,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setMessage(result.message ?? "Aktion fehlgeschlagen.");
        return;
      }
      router.refresh();
    });
  }

  const activeBookings = bookings.filter((b) =>
    ["held", "confirmed", "attended", "no_show"].includes(b.status),
  );

  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1f2937]">Teilnehmer</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            {participation.confirmedSeatCount} bestätigte Plätze · Kapazität{" "}
            {participation.capacity}
            {participation.minimumParticipants > 1 ? (
              <>
                {" "}
                · Mindestteilnehmer {participation.minimumParticipants}{" "}
                {participation.meetsMinimum ? (
                  <span className="font-medium text-green-800">(erreicht)</span>
                ) : (
                  <span className="font-medium text-amber-800">(noch nicht erreicht)</span>
                )}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {message ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {message}
        </p>
      ) : null}

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b7280]">Noch keine Buchungen für diesen Termin.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          {activeBookings.length === 0 ? (
            <p className="mb-3 text-sm text-[#6b7280]">Keine aktiven Buchungen — Historie unten.</p>
          ) : null}
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                <th className="px-2 py-2">Kontakt</th>
                <th className="px-2 py-2">Plätze</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Zahlung</th>
                <th className="px-2 py-2">Bestellung</th>
                <th className="px-2 py-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#f3f4f6] align-top ${
                    ["cancelled", "expired", "refunded"].includes(row.status) ? "opacity-70" : ""
                  }`}
                >
                  <td className="px-2 py-3">
                    <span className="font-medium text-[#1f2937]">{row.contactEmail}</span>
                    {row.customerId ? (
                      <p className="mt-0.5 text-xs text-[#6b7280]">Kundenkonto verknüpft</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-[#6b7280]">Gast</p>
                    )}
                  </td>
                  <td className="px-2 py-3 tabular-nums">{row.seatCount}</td>
                  <td className="px-2 py-3">{row.statusLabel}</td>
                  <td className="px-2 py-3">{row.paymentSummary}</td>
                  <td className="px-2 py-3">
                    {row.orderId && row.orderNumber ? (
                      <Link
                        href={`/admin/orders/${row.orderId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{row.orderNumber}
                      </Link>
                    ) : (
                      <span className="text-[#9ca3af]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {row.status === "confirmed" ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              setWorkshopBookingAttendanceAction(row.id, sessionId, "attended"),
                            )
                          }
                          className="rounded border border-[#d1d5db] px-2 py-1 text-xs font-medium hover:bg-[#f9fafb] disabled:opacity-60"
                        >
                          Anwesend
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              setWorkshopBookingAttendanceAction(row.id, sessionId, "no_show"),
                            )
                          }
                          className="rounded border border-[#d1d5db] px-2 py-1 text-xs font-medium hover:bg-[#f9fafb] disabled:opacity-60"
                        >
                          No-Show
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Buchung wirklich stornieren? Plätze werden freigegeben. Erstattungen erfolgen ggf. manuell über die Bestellung.",
                              )
                            ) {
                              return;
                            }
                            run(() => adminCancelWorkshopBookingAction(row.id, sessionId));
                          }}
                          className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-60"
                        >
                          Stornieren
                        </button>
                      </div>
                    ) : row.status === "attended" || row.status === "no_show" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            setWorkshopBookingAttendanceAction(row.id, sessionId, "confirmed"),
                          )
                        }
                        className="rounded border border-[#d1d5db] px-2 py-1 text-xs font-medium hover:bg-[#f9fafb] disabled:opacity-60"
                      >
                        Zurücksetzen
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
