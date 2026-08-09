import Link from "next/link";
import { WorkshopSessionForm } from "@/app/admin/(dashboard)/termine/workshop-session-form";
import { AdminWorkshopSchemaBanner } from "@/components/admin/workshops/admin-workshop-schema-banner";
import {
  isWorkshopSchemaAvailable,
  WORKSHOP_SCHEMA_MISSING_ADMIN_HINT,
  WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE,
} from "@/features/workshops";

export const metadata = {
  title: "Termin anlegen",
};

export default async function AdminNewWorkshopSessionPage() {
  const schemaReady = await isWorkshopSchemaAvailable();

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
        <h1 className="mt-2 text-2xl font-semibold text-[#1f2937]">Termin anlegen</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Der Termin wird als Entwurf gespeichert und kann danach veröffentlicht werden.
        </p>
      </div>
      {schemaReady ? <WorkshopSessionForm /> : null}
    </div>
  );
}
