import Link from "next/link";
import { ContentPageForm } from "@/app/admin/(dashboard)/inhalte/content-page-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Neue Inhaltsseite",
};

export default function AdminInhalteNewPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <Link
        href="/admin/inhalte"
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Inhalte
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
        Neue Seite
      </h1>
      <p className="mt-1 text-sm text-[#6b7280]">
        Metadaten und Blöcke speichern — Veröffentlichung wirkt erst mit Storefront-Routing.
      </p>
      <div className="mt-8">
        <ContentPageForm />
      </div>
    </div>
  );
}
