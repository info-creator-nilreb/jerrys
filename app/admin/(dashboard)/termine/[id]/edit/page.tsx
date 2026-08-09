import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkshopSessionDuplicateButton } from "@/app/admin/(dashboard)/termine/workshop-session-duplicate-button";
import { WorkshopSessionForm } from "@/app/admin/(dashboard)/termine/workshop-session-form";
import { WorkshopSessionLifecycleButtons } from "@/app/admin/(dashboard)/termine/workshop-session-lifecycle-buttons";
import {
  WorkshopSessionStatusBadge,
  workshopSessionReadOnlyHint,
} from "@/components/admin/workshops/workshop-session-status-badge";
import { getWorkshopSessionForAdmin } from "@/features/workshops";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Termin bearbeiten",
};

export default async function AdminEditWorkshopSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gespeichert?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getWorkshopSessionForAdmin(id);
  if (!session) notFound();

  const readOnly = session.status !== "draft";
  const hint = workshopSessionReadOnlyHint(session);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="space-y-3">
        <Link href="/admin/termine" className="text-sm font-medium text-primary hover:underline">
          ← Termine
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="min-w-0 text-2xl font-semibold text-[#1f2937]">{session.title}</h1>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              href={`/admin/termine/serie?vorlage=${session.id}`}
              className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              Serie aus Vorlage
            </Link>
            <WorkshopSessionDuplicateButton sessionId={session.id} />
            <WorkshopSessionLifecycleButtons sessionId={session.id} status={session.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WorkshopSessionStatusBadge status={session.status} label={session.statusLabel} />
          <span className="text-sm text-[#6b7280]">
            Plätze: {session.confirmedSeatCount + session.heldSeatCount}/{session.capacity}
          </span>
        </div>
      </div>

      {sp.gespeichert === "1" ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          Entwurf gespeichert.
        </p>
      ) : null}

      {hint ? (
        <p className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#374151]">{hint}</p>
      ) : null}

      <WorkshopSessionForm session={session} readOnly={readOnly} />
    </div>
  );
}
