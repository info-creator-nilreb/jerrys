import { netCentsFromGross } from "@/lib/catalog/pricing";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";
import { vatAppliesForShippingCountry } from "@/lib/tax/eu-vat";
import type {
  PromotionRecord,
  PromotionValidationReason,
  ResolvedCheckoutPromotion,
} from "@/lib/promotions/types";

export function normalizePromotionCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

function catalogGrossSubtotalCents(lines: OrderPriceLineInput[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.priceGrossCents, 0);
}

function catalogNetSubtotalCents(lines: OrderPriceLineInput[]): number {
  let s = 0;
  for (const l of lines) {
    s += l.quantity * netCentsFromGross(l.priceGrossCents, l.taxRatePercent);
  }
  return s;
}

/** Mindestwarenkorb: immer auf Basis Katalog-Bruttosumme (EUR), vor Rabatt. */
function minCartMet(promotion: PromotionRecord, lines: OrderPriceLineInput[]): boolean {
  if (promotion.minimumRequirementType === "none") return true;
  if (promotion.minimumRequirementType !== "cart_value") return true;
  const min = promotion.minimumCartValueCents;
  if (min == null || min <= 0) return true;
  const gross = catalogGrossSubtotalCents(lines);
  return gross >= min;
}

function orderValueForDiscountCents(
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
): number {
  if (vatAppliesForShippingCountry(shippingCountryCode)) {
    return catalogGrossSubtotalCents(lines);
  }
  return catalogNetSubtotalCents(lines);
}

export function computePromotionDiscountOffSubtotalCents(
  promotion: PromotionRecord,
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
): number {
  const orderVal = orderValueForDiscountCents(lines, shippingCountryCode);
  if (orderVal <= 0) return 0;

  if (promotion.discountValueType === "percent") {
    const p = promotion.discountValue;
    if (p <= 0 || p > 100) return 0;
    return Math.min(Math.round((orderVal * p) / 100), orderVal);
  }

  if (promotion.discountValueType === "fixed") {
    const fixed = promotion.discountValue;
    if (fixed <= 0) return 0;
    return Math.min(fixed, orderVal);
  }

  return 0;
}

export function isPromotionEligibleNow(promotion: PromotionRecord, now: Date): boolean {
  if (!promotion.isEnabled) return false;
  if (now < promotion.startDate || now > promotion.endDate) return false;
  return true;
}

export function evaluatePromotionCodeEntry(
  codeNorm: string,
  codePromotion: PromotionRecord | null,
  lines: OrderPriceLineInput[],
  now: Date,
):
  | { status: "empty" }
  | { status: "invalid"; reason: PromotionValidationReason }
  | { status: "valid"; promotion: PromotionRecord } {
  if (!codeNorm) return { status: "empty" };
  const v = validatePromotionCodeApplication(codePromotion, lines, now);
  if (!v.ok) return { status: "invalid", reason: v.reason };
  return { status: "valid", promotion: codePromotion! };
}

export function validatePromotionCodeApplication(
  promotion: PromotionRecord | null,
  lines: OrderPriceLineInput[],
  now: Date,
): { ok: true } | { ok: false; reason: PromotionValidationReason } {
  if (!promotion) {
    return { ok: false, reason: "CODE_NOT_FOUND" };
  }
  if (promotion.applicationMode !== "code") {
    return { ok: false, reason: "WRONG_APPLICATION_MODE" };
  }
  if (!promotion.isEnabled) {
    return { ok: false, reason: "CODE_DEACTIVATED" };
  }
  if (now > promotion.endDate) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (now < promotion.startDate) {
    return { ok: false, reason: "NOT_YET_ACTIVE" };
  }
  if (!minCartMet(promotion, lines)) {
    return { ok: false, reason: "MIN_CART_NOT_MET" };
  }
  return { ok: true };
}

export function validateAutomaticPromotionApplication(
  promotion: PromotionRecord,
  lines: OrderPriceLineInput[],
  now: Date,
): { ok: true } | { ok: false; reason: PromotionValidationReason } {
  if (promotion.applicationMode !== "automatic") {
    return { ok: false, reason: "WRONG_APPLICATION_MODE" };
  }
  if (!promotion.isEnabled) {
    return { ok: false, reason: "CODE_DEACTIVATED" };
  }
  if (now > promotion.endDate) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (now < promotion.startDate) {
    return { ok: false, reason: "NOT_YET_ACTIVE" };
  }
  if (!minCartMet(promotion, lines)) {
    return { ok: false, reason: "MIN_CART_NOT_MET" };
  }
  return { ok: true };
}

export function promotionValidationMessage(reason: PromotionValidationReason): string {
  switch (reason) {
    case "CODE_NOT_FOUND":
      return "Dieser Code existiert nicht.";
    case "CODE_DEACTIVATED":
      return "Dieser Rabattcode ist deaktiviert.";
    case "NOT_YET_ACTIVE":
      return "Dieser Code ist noch nicht aktiv.";
    case "EXPIRED":
      return "Dieser Code ist abgelaufen.";
    case "MIN_CART_NOT_MET":
      return "Der Mindestwarenkorbwert für diesen Rabatt ist nicht erreicht.";
    case "WRONG_APPLICATION_MODE":
      return "Dieser Rabatt kann so nicht angewendet werden.";
    default:
      return "Der Rabattcode konnte nicht angewendet werden.";
  }
}

/**
 * Wählt die beste automatische Promotion (höchster Rabattbetrag in Cent).
 */
export function pickBestAutomaticPromotion(
  candidates: PromotionRecord[],
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
  now: Date,
): PromotionRecord | null {
  let best: PromotionRecord | null = null;
  let bestDiscount = -1;

  for (const p of candidates) {
    if (!isPromotionEligibleNow(p, now)) continue;
    const v = validateAutomaticPromotionApplication(p, lines, now);
    if (!v.ok) continue;
    const d = computePromotionDiscountOffSubtotalCents(p, lines, shippingCountryCode);
    if (d > bestDiscount) {
      bestDiscount = d;
      best = p;
    }
  }

  return best;
}

export function resolveCheckoutPromotion(input: {
  lines: OrderPriceLineInput[];
  shippingCountryCode: string;
  now: Date;
  /** Normalisierter Code oder leer */
  promotionCode: string | null;
  /** Keine automatische Promotion (z. B. Nutzer hat Auto-Rabatt entfernt) */
  declineAutomatic: boolean;
  /** Promotion aus Code-Lookup (oder null) */
  codePromotion: PromotionRecord | null;
  /** Alle automatischen, aktivierten Promotions (Datum gefiltert optional — Engine prüft nochmal) */
  automaticCandidates: PromotionRecord[];
}): ResolvedCheckoutPromotion {
  const codeNorm = normalizePromotionCode(input.promotionCode);

  if (codeNorm.length > 0) {
    const v = validatePromotionCodeApplication(input.codePromotion, input.lines, input.now);
    if (!v.ok) {
      return { kind: "none" };
    }
    const p = input.codePromotion!;
    const discount = computePromotionDiscountOffSubtotalCents(p, input.lines, input.shippingCountryCode);
    return {
      kind: "applied",
      promotionId: p.id,
      title: p.title,
      code: p.code,
      discountOffSubtotalCents: discount,
      source: "code",
    };
  }

  if (input.declineAutomatic) {
    return { kind: "none" };
  }

  const best = pickBestAutomaticPromotion(
    input.automaticCandidates,
    input.lines,
    input.shippingCountryCode,
    input.now,
  );
  if (!best) {
    return { kind: "none" };
  }

  const discount = computePromotionDiscountOffSubtotalCents(
    best,
    input.lines,
    input.shippingCountryCode,
  );
  if (discount <= 0) {
    return { kind: "none" };
  }

  return {
    kind: "applied",
    promotionId: best.id,
    title: best.title,
    code: best.code,
    discountOffSubtotalCents: discount,
    source: "automatic",
  };
}
