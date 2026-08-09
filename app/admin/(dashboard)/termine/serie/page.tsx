import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkshopSessionSeriesForm } from "@/app/admin/(dashboard)/termine/workshop-session-series-form";
import { AdminWorkshopSchemaBanner } from "@/components/admin/workshops/admin-workshop-schema-banner";
import {
  getWorkshopSessionForAdmin,
  isWorkshopSchemaAvailable,
  WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE,
} from "@/features/workshops";

export const metadata = {
  title: "Termin-Serie anlegen",
};

export default async function AdminWorkshopSessionSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ vorlage?: string }>;
}) {
  const schemaReady = await isWorkshopSchemaAvailable();
  const sp = await searchParams;
  const template =
    sp.vorlage && schemaReady ? await getWorkshopSessionForAdmin(sp.vorlage) : null;
  if (sp.vorlage && schemaReady && !template) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {!schemaReady ? (
        <AdminWorkshopSchemaBanner message={WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE} />
      ) : null}
      <div>
        <Link href="/admin/termine" className="text-sm font-medium text-primary hover:underline">
          ← Termine
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#1f2937]">Termin-Serie anlegen</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Mehrere Workshop-Termine mit gleicher Vorlage — jeder Eintrag wird ein eigener Entwurf.
          {template ? " Vorlage aus bestehendem Termin übernommen (Beginn-Zeilen bitte neu setzen)." : null}
        </p>
      </div>
      {schemaReady ? <WorkshopSessionSeriesForm template={template} /> : null}
    </div>
  );
}
