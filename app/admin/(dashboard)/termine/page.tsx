import Link from "next/link";
import {
  getShopWorkshopSettingsForAdmin,
  isWorkshopSchemaAvailable,
  listWorkshopSessionsForAdmin,
  countDraftWorkshopSessionsBySeriesBatch,
  countPendingWorkshopDateRequestsForAdmin,
  WORKSHOP_SCHEMA_MISSING_ADMIN_HINT,
  WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE,
} from "@/features/workshops";
import { WorkshopGlobalSettingsForm } from "@/app/admin/(dashboard)/termine/workshop-global-settings-form";
import { WorkshopSessionAdminList } from "@/app/admin/(dashboard)/termine/workshop-session-admin-list";
import { WorkshopSessionSerieBatchBanner } from "@/app/admin/(dashboard)/termine/workshop-session-serie-batch-banner";
import { AdminWorkshopSchemaBanner } from "@/components/admin/workshops/admin-workshop-schema-banner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Termine",
};

export default async function AdminWorkshopSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ serieAngelegt?: string; serieBatch?: string; veroeffentlicht?: string }>;
}) {
  const schemaReady = await isWorkshopSchemaAvailable();
  const sp = await searchParams;
  const serieCount = sp.serieAngelegt ? Number.parseInt(sp.serieAngelegt, 10) : 0;
  const publishedCount = sp.veroeffentlicht ? Number.parseInt(sp.veroeffentlicht, 10) : 0;
  const serieBatchId = sp.serieBatch?.trim() || null;

  const [sessions, settings, draftInBatch, pendingWunsch] = await Promise.all([
    listWorkshopSessionsForAdmin(),
    getShopWorkshopSettingsForAdmin(),
    serieBatchId && schemaReady
      ? countDraftWorkshopSessionsBySeriesBatch(serieBatchId)
      : Promise.resolve(0),
    schemaReady ? countPendingWorkshopDateRequestsForAdmin() : Promise.resolve(0),
  ]);

  const showSerieBanner =
    schemaReady &&
    serieBatchId &&
    Number.isFinite(serieCount) &&
    serieCount > 0;

  const showPublishedBanner =
    Number.isFinite(publishedCount) && publishedCount > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {!schemaReady ? (
        <AdminWorkshopSchemaBanner
          message={WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE}
          hint={WORKSHOP_SCHEMA_MISSING_ADMIN_HINT}
        />
      ) : null}
      {showPublishedBanner ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          {publishedCount} Termin/Termine veröffentlicht — im Shop sichtbar, sofern Beginn in der Zukunft liegt.
        </p>
      ) : null}
      {showSerieBanner ? (
        <WorkshopSessionSerieBatchBanner
          batchId={serieBatchId}
          createdCount={serieCount}
          draftCount={draftInBatch}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Termine</h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            Gruppentermine und Workshops verwalten. Entwürfe kannst du einzeln oder per Bulk veröffentlichen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {schemaReady && pendingWunsch > 0 ? (
            <Link
              href="/admin/termine/wunschtermine"
              className="inline-flex min-h-11 items-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
            >
              Wunschtermine ({pendingWunsch})
            </Link>
          ) : schemaReady ? (
            <Link
              href="/admin/termine/wunschtermine"
              className="inline-flex min-h-11 items-center rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
            >
              Wunschtermine
            </Link>
          ) : null}
          <Link
            href="/admin/termine/serie"
            aria-disabled={!schemaReady}
            className={
              schemaReady
                ? "inline-flex min-h-11 items-center rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
                : "pointer-events-none inline-flex min-h-11 cursor-not-allowed items-center rounded-md border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#9ca3af]"
            }
          >
            Serie anlegen
          </Link>
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
      </div>

      <WorkshopGlobalSettingsForm defaults={settings} disabled={!schemaReady} />

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-[#fafbfc] px-6 py-12 text-center">
          <p className="text-sm text-[#6b7280]">Noch keine Termine. Lege einen Entwurf an und veröffentliche ihn.</p>
        </div>
      ) : (
        <WorkshopSessionAdminList sessions={sessions} />
      )}
    </div>
  );
}
