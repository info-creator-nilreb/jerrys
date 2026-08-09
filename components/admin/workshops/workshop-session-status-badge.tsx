import type { AdminWorkshopSessionDetail } from "@/features/workshops";

const styles: Record<string, string> = {
  draft: "bg-[#f3f4f6] text-[#374151]",
  published: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-[#e0e7ff] text-[#3730a3]",
};

export function WorkshopSessionStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-[#f3f4f6] text-[#374151]"}`}
    >
      {label}
    </span>
  );
}

export function workshopSessionReadOnlyHint(session: AdminWorkshopSessionDetail): string | null {
  if (session.status === "draft") return null;
  if (session.status === "published") {
    return "Veröffentlichte Termine sind hier schreibgeschützt. Du kannst den Termin absagen oder nach Ende abschließen.";
  }
  return "Dieser Termin ist abgeschlossen oder abgesagt und kann nicht mehr bearbeitet werden.";
}
