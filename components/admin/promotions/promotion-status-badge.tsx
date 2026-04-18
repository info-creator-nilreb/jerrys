import type { PromotionDisplayStatus } from "@/lib/promotions/types";

const LABELS: Record<PromotionDisplayStatus, string> = {
  entwurf: "Entwurf",
  geplant: "Geplant",
  aktiv: "Aktiv",
  abgelaufen: "Abgelaufen",
  deaktiviert: "Deaktiviert",
};

const STYLES: Record<PromotionDisplayStatus, string> = {
  entwurf: "bg-[#f3f4f6] text-[#4b5563] ring-1 ring-[#e5e7eb]",
  geplant: "bg-sky-50 text-sky-900 ring-1 ring-sky-100",
  aktiv: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100",
  abgelaufen: "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
  deaktiviert: "bg-[#f3f4f6] text-[#9ca3af] ring-1 ring-[#e5e7eb]",
};

export function PromotionStatusBadge({ status }: { status: PromotionDisplayStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
