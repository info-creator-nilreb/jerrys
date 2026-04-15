import { allowedNextOrderStatuses } from "@/lib/orders/order-status-machine";

/** Achsen-Keys für die Admin-Oberfläche (nicht identisch mit DB-Status). */
export type AdminPaymentKey = "offen" | "bezahlt" | "erstattet";
export type AdminShippingKey = "offen" | "versandt" | "retoure";
export type AdminOrderKey = "offen" | "in_bearbeitung" | "abgebrochen" | "abgeschlossen";

export type AdminTriple = {
  payment: AdminPaymentKey;
  shipping: AdminShippingKey;
  order: AdminOrderKey;
};

export type AdminTripleDimension = "payment" | "shipping" | "order";

export type OrderForTriple = {
  status: string;
  payments: { status: string }[];
  statusHistory?: { toStatus: string | null; fromStatus: string | null }[];
};

function hadShippedOrReturnInHistory(
  history: { toStatus: string | null }[] | undefined,
): boolean {
  if (!history?.length) return false;
  return history.some((h) =>
    ["shipped", "completed", "retoure"].includes(h.toStatus ?? ""),
  );
}

/**
 * Leitet die drei Anzeige-Achsen aus dem gespeicherten Bestellstatus ab.
 * Bei „cancelled“/„refunded“ helfen PSP-Zahlungen und die Status-Historie.
 */
export function deriveTripleFromOrder(order: OrderForTriple): AdminTriple {
  const { status, payments } = order;
  const history = order.statusHistory ?? [];
  const hadSucceededPsp = payments.some((p) => p.status === "succeeded");

  switch (status) {
    case "draft":
    case "pending_payment":
      return { payment: "offen", shipping: "offen", order: "offen" };
    case "bestaetigt":
    case "paid":
      return { payment: "bezahlt", shipping: "offen", order: "offen" };
    case "processing":
      return { payment: "bezahlt", shipping: "offen", order: "in_bearbeitung" };
    case "shipped":
      return { payment: "bezahlt", shipping: "versandt", order: "in_bearbeitung" };
    case "retoure":
      return { payment: "bezahlt", shipping: "retoure", order: "in_bearbeitung" };
    case "completed":
      return { payment: "bezahlt", shipping: "versandt", order: "abgeschlossen" };
    case "cancelled": {
      const hadCapture =
        hadSucceededPsp ||
        history.some((h) =>
          ["bestaetigt", "paid", "processing", "shipped", "completed"].includes(h.toStatus ?? ""),
        );
      return {
        payment: hadCapture ? "bezahlt" : "offen",
        shipping: "offen",
        order: "abgebrochen",
      };
    }
    case "refunded":
      return {
        payment: "erstattet",
        shipping: hadShippedOrReturnInHistory(history) ? "versandt" : "offen",
        order: "abgeschlossen",
      };
    default:
      return { payment: "offen", shipping: "offen", order: "offen" };
  }
}

export function adminTripleAxisLabel(dim: AdminTripleDimension): string {
  switch (dim) {
    case "payment":
      return "Zahlungsstatus";
    case "shipping":
      return "Lieferstatus";
    case "order":
      return "Bestellstatus";
    default:
      return dim;
  }
}

export function adminTripleOptionLabel(dim: AdminTripleDimension, key: string): string {
  if (dim === "payment") {
    switch (key as AdminPaymentKey) {
      case "offen":
        return "Offen";
      case "bezahlt":
        return "Bezahlt";
      case "erstattet":
        return "Erstattet";
      default:
        return key;
    }
  }
  if (dim === "shipping") {
    switch (key as AdminShippingKey) {
      case "offen":
        return "Offen";
      case "versandt":
        return "Versandt";
      case "retoure":
        return "Retoure";
      default:
        return key;
    }
  }
  switch (key as AdminOrderKey) {
    case "offen":
      return "Offen";
    case "in_bearbeitung":
      return "In Bearbeitung";
    case "abgebrochen":
      return "Abgebrochen (storniert)";
    case "abgeschlossen":
      return "Abgeschlossen";
    default:
      return key;
  }
}

const PAYMENT_OPTIONS: AdminPaymentKey[] = ["offen", "bezahlt", "erstattet"];
const SHIPPING_OPTIONS: AdminShippingKey[] = ["offen", "versandt", "retoure"];
const ORDER_OPTIONS: AdminOrderKey[] = [
  "offen",
  "in_bearbeitung",
  "abgebrochen",
  "abgeschlossen",
];

export function adminTripleOptions(dim: AdminTripleDimension): readonly string[] {
  if (dim === "payment") return PAYMENT_OPTIONS;
  if (dim === "shipping") return SHIPPING_OPTIONS;
  return ORDER_OPTIONS;
}

function tripleDim(t: AdminTriple, dim: AdminTripleDimension): string {
  return t[dim];
}

/** Nächster DB-Status, der die gewählte Achse in einem Schritt erreicht (falls möglich). */
export function pickNextStatusForDimension(
  order: OrderForTriple,
  dim: AdminTripleDimension,
  target: string,
): string | null {
  const candidates = allowedNextOrderStatuses(order.status);
  for (const c of candidates) {
    const t = deriveTripleFromOrder({ ...order, status: c });
    if (tripleDim(t, dim) === target) return c;
  }
  return null;
}

export function isTripleOptionEnabled(
  order: OrderForTriple,
  dim: AdminTripleDimension,
  target: string,
): boolean {
  const current = deriveTripleFromOrder(order);
  if (tripleDim(current, dim) === target) return true;
  return pickNextStatusForDimension(order, dim, target) !== null;
}

/** Klassen für das Pill-Select (Hintergrund + Textfarbe). */
export function adminTripleSelectSurfaceClass(
  dim: AdminTripleDimension,
  key: string,
): string {
  if (dim === "payment") {
    switch (key as AdminPaymentKey) {
      case "bezahlt":
        return "bg-primary/10 text-primary";
      case "erstattet":
        return "bg-amber-50 text-amber-800";
      default:
        return "bg-[#f3f4f6] text-[#6b7280]";
    }
  }
  if (dim === "shipping") {
    switch (key as AdminShippingKey) {
      case "versandt":
        return "bg-primary/10 text-primary";
      case "retoure":
        return "bg-amber-50 text-amber-800";
      default:
        return "bg-[#f3f4f6] text-[#6b7280]";
    }
  }
  switch (key as AdminOrderKey) {
    case "abgeschlossen":
      return "bg-primary/10 text-primary";
    case "abgebrochen":
      return "bg-rose-50 text-rose-800";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}
