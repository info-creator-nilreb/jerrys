import type { StockMovementReason } from "@/app/generated/prisma/client";

const labels: Record<StockMovementReason, string> = {
  reservation_hold: "Reservierung (Hold)",
  reservation_release: "Reservierung freigegeben",
  reservation_commit: "Reservierung verbucht",
  warehouse_ship: "Versand Lager",
  warehouse_return: "Retoure Lager",
  manual_adjustment: "Manuelle Korrektur",
};

export function stockMovementReasonLabel(reason: StockMovementReason): string {
  return labels[reason] ?? reason;
}
