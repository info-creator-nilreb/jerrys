import Link from "next/link";
import {
  getShopWorkshopSettingsForAdmin,
  isWorkshopSchemaAvailable,
  listWorkshopSessionsForAdmin,
  WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE,
} from "@/features/workshops";
import { WorkshopGlobalSettingsForm } from "@/app/admin/(dashboard)/termine/workshop-global-settings-form";
import { AdminWorkshopSchemaBanner } from "@/components/admin/workshops/admin-workshop-schema-banner";
import { WorkshopSessionStatusBadge } from "@/components/admin/workshops/workshop-session-status-badge";
import { formatWorkshopSessionDateTime } from "@/lib/workshop/format-session-datetime";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Termine",
};

export default async function AdminWorkshopSessionsPage() {
  const schemaReady = await isWorkshopSchemaAvailable();
  const [sessions, settings] = await Promise.all([
    listWorkshopSessionsForAdmin(),
    getShopWorkshopSettingsForAdmin(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {!schemaReady ? (
        <AdminWorkshopSchemaBanner message={WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Termine</h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            Gruppentermine und Workshops verwalten. Veröffentlichte Termine werden in Epic 5 Slice 2 im
            Shop sichtbar.
          </p>
        </div>
        <Link
          href="/admin/termine/neu"
          aria-disabled={!schemaReady}
          className={
            schemaReady
              ? "inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover)"
              : "pointer-events-none inline-flex min-h-11 cursor-not-allowed items-center rounded-md bg-primary/40 px-4 py-2 text-sm font-semibold text-white"
          }
        >
          Termin anlegen
        </Link>
      </div>

      <WorkshopGlobalSettingsForm defaults={settings} disabled={!schemaReady} />

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-[#fafbfc] px-6 py-12 text-center">
          <p className="text-sm text-[#6b7280]">Noch keine Termine. Lege einen Entwurf an und veröffentliche ihn.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#e8eaed]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
              <tr>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 font-medium">Beginn</th>
                <th className="px-4 py-3 font-medium">Ort</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Plätze</th>
                <th className="px-4 py-3 font-medium text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eaed]">
              {sessions.map((s) => (
                <tr key={s.id} className="bg-white">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
