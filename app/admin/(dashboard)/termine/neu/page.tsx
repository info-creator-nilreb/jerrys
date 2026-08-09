import Link from "next/link";
import { WorkshopSessionForm } from "@/app/admin/(dashboard)/termine/workshop-session-form";

export const metadata = {
  title: "Termin anlegen",
};

export default function AdminNewWorkshopSessionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div>
        <Link href="/admin/termine" className="text-sm font-medium text-primary hover:underline">
          ← Termine
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#1f2937]">Termin anlegen</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Der Termin wird als Entwurf gespeichert und kann danach veröffentlicht werden.
        </p>
      </div>
      <WorkshopSessionForm />
    </div>
  );
}
