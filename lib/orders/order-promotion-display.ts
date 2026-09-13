/** Felder einer Bestellung, die für die Promotion-Anzeige im Admin ausreichen. */
export type OrderPromotionDisplayInput = {
  discountOffSubtotalCents: number;
  promotionId?: string | null;
  promotionTitleSnapshot?: string | null;
  promotionCodeSnapshot?: string | null;
  promotionType?: string | null;
};

export type OrderPromotionDisplay = {
  /** Rabatt auf Warenwert in Cent (0 wenn nur Versand-Promotion). */
  discountOffSubtotalCents: number;
  /** Warenwert vor Rabatt (subtotalGrossCents + discountOffSubtotalCents). */
  catalogSubtotalBeforeDiscountCents: number;
  /** Kurzlabel für die Promotion-Zeile (Titel oder Fallback). */
  label: string;
  /** Zusatzinfo: Code oder „Automatisch“. */
  detail: string | null;
  /** Promotion-Typ aus DB oder Heuristik. */
  promotionType: "order_discount" | "free_shipping" | "cheapest_item_percent" | "unknown";
  /** Ob überhaupt eine Promotion/Rabatt erkennbar ist. */
  hasPromotion: boolean;
};

function normalizePromotionType(
  raw: string | null | undefined,
): OrderPromotionDisplay["promotionType"] {
  switch (raw) {
    case "order_discount":
    case "free_shipping":
    case "cheapest_item_percent":
      return raw;
    default:
      return "unknown";
  }
}

function inferPromotionType(input: OrderPromotionDisplayInput): OrderPromotionDisplay["promotionType"] {
  const fromRelation = normalizePromotionType(input.promotionType);
  if (fromRelation !== "unknown") return fromRelation;
  if (input.discountOffSubtotalCents > 0) return "order_discount";
  if (input.promotionTitleSnapshot || input.promotionId) return "free_shipping";
  return "unknown";
}

/** Ob die Bestellung eine erkennbare Promotion oder einen Warenrabatt hat. */
export function orderHasPromotionApplied(input: OrderPromotionDisplayInput): boolean {
  return (
    input.discountOffSubtotalCents > 0 ||
    Boolean(input.promotionId) ||
    Boolean(input.promotionTitleSnapshot?.trim())
  );
}

/** Kurzlabel für Listen (z. B. Admin-Bestellübersicht). */
export function orderPromotionListLabel(input: OrderPromotionDisplayInput): string | null {
  if (!orderHasPromotionApplied(input)) return null;
  const title = input.promotionTitleSnapshot?.trim();
  if (title) return title;
  if (input.discountOffSubtotalCents > 0) return "Rabatt";
  if (input.promotionCodeSnapshot?.trim()) return input.promotionCodeSnapshot.trim();
  return "Promotion";
}

/**
 * Aufbereitung der Promotion-Daten für Admin-Detail (Summenblock).
 * `subtotalGrossCents` ist der Warenwert nach Rabatt.
 */
export function buildOrderPromotionDisplay(
  input: OrderPromotionDisplayInput & { subtotalGrossCents: number },
): OrderPromotionDisplay {
  const discountOffSubtotalCents = Math.max(0, input.discountOffSubtotalCents);
  const hasPromotion = orderHasPromotionApplied(input);
  const promotionType = inferPromotionType(input);
  const title = input.promotionTitleSnapshot?.trim();
  const code = input.promotionCodeSnapshot?.trim();

  const label =
    title ??
    (discountOffSubtotalCents > 0 ? "Rabatt" : code ? `Code ${code}` : "Promotion");

  const detail = code
    ? `Code: ${code}`
    : input.promotionId || title
      ? "Automatisch"
      : discountOffSubtotalCents > 0
        ? "Import / ohne Promotion-Metadaten"
        : null;

  return {
    discountOffSubtotalCents,
    catalogSubtotalBeforeDiscountCents:
      input.subtotalGrossCents + discountOffSubtotalCents,
    label,
    detail,
    promotionType,
    hasPromotion,
  };
}
