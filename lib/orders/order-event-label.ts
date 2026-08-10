import type { Prisma } from "@/app/generated/prisma/client";
import { emailSendStatusLabel, emailTypeLabel } from "@/lib/orders/email-status-label";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export function orderEventTypeTitle(eventType: string): string {
  switch (eventType) {
    case "order.placed":
      return "Bestellung eingegangen";
    case "order.status_changed":
      return "Status geändert";
    case "order.refunded":
      return "Erstattung";
    case "email.delivery":
      return "E-Mail-Versand";
    default:
      return eventType;
  }
}

/** Kurzbeschreibung aus `metadata` (für Admin-Liste). */
export function orderEventMetadataDescription(
  eventType: string,
  metadata: Prisma.JsonValue | null,
): string {
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }
  const m = metadata as Record<string, unknown>;

  switch (eventType) {
    case "order.placed": {
      const nr = typeof m.orderNumber === "string" ? m.orderNumber : "";
      const parts: string[] = [];
      if (nr) parts.push(`Bestellnr. ${nr}`);
      if (m.backfill === true) parts.push("nachträglich protokolliert");
      return parts.join(" · ");
    }
    case "order.status_changed": {
      const from = typeof m.fromStatus === "string" ? m.fromStatus : "";
      const to = typeof m.toStatus === "string" ? m.toStatus : "";
      if (!to) return "";
      const fromLabel = from ? orderStatusLabel(from) : "Start";
      return `${fromLabel} → ${orderStatusLabel(to)}`;
    }
    case "order.refunded": {
      const amount =
        typeof m.amountCents === "number" && Number.isFinite(m.amountCents)
          ? `${(m.amountCents / 100).toFixed(2)} €`
          : "";
      const provider = typeof m.provider === "string" ? m.provider : "";
      const full = m.full === true ? "vollständig" : m.full === false ? "teilweise" : "";
      return [amount, full, provider].filter(Boolean).join(" · ");
    }
    case "email.delivery": {
      const et = typeof m.emailType === "string" ? m.emailType : "";
      const ds = typeof m.deliveryStatus === "string" ? m.deliveryStatus : "";
      const a = et ? emailTypeLabel(et) : "";
      const b = ds ? emailSendStatusLabel(ds) : "";
      return [a, b].filter(Boolean).join(" · ");
    }
    default:
      return "";
  }
}
