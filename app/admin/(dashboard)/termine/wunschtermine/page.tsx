import Link from "next/link";
import {
  isWorkshopSchemaAvailable,
  listWorkshopDateRequestsForAdmin,
  WORKSHOP_SCHEMA_MISSING_ADMIN_HINT,
  WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE,
} from "@/features/workshops";
import { AdminWorkshopSchemaBanner } from "@/components/admin/workshops/admin-workshop-schema-banner";
import { WorkshopDateRequestAdminList } from "@/app/admin/(dashboard)/termine/wunschtermine/workshop-date-request-admin-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wunschtermine",
};

export default async function AdminWorkshopDateRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const schemaReady = await isWorkshopSchemaAvailable();
  const sp = await searchParams;
  const filter = sp.filter === "all" ? "all" : "pending";

  const requests = schemaReady
    ? await listWorkshopDateRequestsForAdmin(filter === "pending" ? "pending" : "all")
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {!schemaReady ? (
        <AdminWorkshopSchemaBanner
          message={WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE}
          hint={WORKSHOP_SCHEMA_MISSING_ADMIN_HINT}
        />
      ) : null}

      <div>
        <Link href="/admin/termine" className="text-sm font-medium text-primary hover:underline">
          ← Termine
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#1f2937]">Wunschtermine</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Kundenanfragen ohne Zahlung. Bei Bestätigung wird ein Termin-Entwurf mit Wunschdatum angelegt — Ort
          und Details bitte vor Veröffentlichung ergänzen.
        </p>
      </div>

      {schemaReady ? (
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/termine/wunschtermine"
            className={
              filter === "pending"
                ? "font-semibold text-primary"
                : "text-[#6b7280] hover:text-primary"
            }
          >
            Offen
          </Link>
          <span className="text-[#d1d5db]" aria-hidden>
            |
          </span>
          <Link
            href="/admin/termine/wunschtermine?filter=all"
            className={
              filter === "all" ? "font-semibold text-primary" : "text-[#6b7280] hover:text-primary"
            }
          >
            Alle
          </Link>
        </div>
      ) : null}

      {schemaReady ? <WorkshopDateRequestAdminList requests={requests} /> : null}
    </div>
  );
}
