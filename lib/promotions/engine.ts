import { netCentsFromGross } from "@/lib/catalog/pricing";
import { shippingGrossCentsForCountry } from "@/lib/shop/shipping-compute";
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

/** Zeilenwert für Rabatt-Basis: EU Brutto, Drittland Netto (wie Warenwert). */
function lineValueForDiscountCents(line: OrderPriceLineInput, shippingCountryCode: string): number {
  if (vatAppliesForShippingCountry(shippingCountryCode)) {
    return line.quantity * line.priceGrossCents;
  }
  return line.quantity * netCentsFromGross(line.priceGrossCents, line.taxRatePercent);
}

/** Versand brutto (Cent) wie im Checkout, inkl. Shop-Frei-Versand-Schwelle – ohne Promotions-Effekt. */
export function computeReferenceShippingGrossCents(
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
  shippingRatesCentsByCountry: Record<string, number>,
  freeShippingFromSubtotalGrossCents: number | null,
): number {
  const catalogSubtotalGross = catalogGrossSubtotalCents(lines);
  return shippingGrossCentsForCountry({
    subtotalGrossCents: catalogSubtotalGross,
    shippingCountryCode,
    shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents,
  });
}

/** Nur `free_shipping`: Lieferland gemäß Admin-Konfiguration (alle / nur Liste / außer Liste). */
export function isFreeShippingAllowedForCountry(
  promotion: PromotionRecord,
  shippingCountryCode: string,
): boolean {
  if (promotion.promotionType !== "free_shipping") return true;
  const scope = promotion.freeShippingCountryScope ?? "all";
  const codes = (promotion.freeShippingCountryCodes ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length === 2);
  const norm = shippingCountryCode.trim().toUpperCase();
  if (norm.length !== 2) return false;
  if (scope === "all") return true;
  if (scope === "allow") {
    if (codes.length === 0) return false;
    return codes.includes(norm);
  }
  if (scope === "deny") {
    if (codes.length === 0) return true;
    return !codes.includes(norm);
  }
  return true;
}

export function computePromotionDiscountOffSubtotalCents(
  promotion: PromotionRecord,
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
): number {
  if (promotion.promotionType === "free_shipping") {
    return 0;
  }

  if (promotion.promotionType === "cheapest_item_percent") {
    if (lines.length === 0) return 0;
    if (promotion.discountValueType !== "percent") return 0;
    const p = promotion.discountValue;
    if (p <= 0 || p > 100) return 0;
    let minLine = Number.POSITIVE_INFINITY;
    for (const line of lines) {
      const v = lineValueForDiscountCents(line, shippingCountryCode);
      if (v > 0 && v < minLine) minLine = v;
    }
    if (minLine === Number.POSITIVE_INFINITY || minLine <= 0) return 0;
    return Math.min(Math.round((minLine * p) / 100), minLine);
  }

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

/** Nutzen für „beste“ automatische Promotion: Warenrabatt in Cent oder eingesparte Versandkosten in Cent. */
export function computePromotionBenefitCents(
  promotion: PromotionRecord,
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
  shippingRatesCentsByCountry: Record<string, number>,
  freeShippingFromSubtotalGrossCents: number | null,
): number {
  if (promotion.promotionType === "free_shipping") {
    if (!isFreeShippingAllowedForCountry(promotion, shippingCountryCode)) return 0;
    return computeReferenceShippingGrossCents(
      lines,
      shippingCountryCode,
      shippingRatesCentsByCountry,
      freeShippingFromSubtotalGrossCents,
    );
  }
  return computePromotionDiscountOffSubtotalCents(promotion, lines, shippingCountryCode);
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
  shippingCountryCode: string,
):
  | { status: "empty" }
  | { status: "invalid"; reason: PromotionValidationReason }
  | { status: "valid"; promotion: PromotionRecord } {
  if (!codeNorm) return { status: "empty" };
  const v = validatePromotionCodeApplication(codePromotion, lines, now, shippingCountryCode);
  if (!v.ok) return { status: "invalid", reason: v.reason };
  return { status: "valid", promotion: codePromotion! };
}

export function validatePromotionCodeApplication(
  promotion: PromotionRecord | null,
  lines: OrderPriceLineInput[],
  now: Date,
  shippingCountryCode?: string,
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
  if (
    promotion.promotionType === "free_shipping" &&
    shippingCountryCode != null &&
    shippingCountryCode.trim() !== "" &&
    !isFreeShippingAllowedForCountry(promotion, shippingCountryCode)
  ) {
    return { ok: false, reason: "FREE_SHIPPING_COUNTRY_NOT_ALLOWED" };
  }
  return { ok: true };
}

export function validateAutomaticPromotionApplication(
  promotion: PromotionRecord,
  lines: OrderPriceLineInput[],
  now: Date,
  shippingCountryCode?: string,
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
  if (
    promotion.promotionType === "free_shipping" &&
    shippingCountryCode != null &&
    shippingCountryCode.trim() !== "" &&
    !isFreeShippingAllowedForCountry(promotion, shippingCountryCode)
  ) {
    return { ok: false, reason: "FREE_SHIPPING_COUNTRY_NOT_ALLOWED" };
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
    case "FREE_SHIPPING_COUNTRY_NOT_ALLOWED":
      return "Dieser Code gilt für das gewählte Lieferland nicht.";
    default:
      return "Der Rabattcode konnte nicht angewendet werden.";
  }
}

/**
 * Wählt die beste automatische Promotion (höchster Nutzen in Cent: Warenrabatt oder gesparte Versandkosten).
 */
export function pickBestAutomaticPromotion(
  candidates: PromotionRecord[],
  lines: OrderPriceLineInput[],
  shippingCountryCode: string,
  now: Date,
  shippingRatesCentsByCountry: Record<string, number>,
  freeShippingFromSubtotalGrossCents: number | null,
): PromotionRecord | null {
  let best: PromotionRecord | null = null;
  let bestBenefit = -1;

  for (const p of candidates) {
    if (!isPromotionEligibleNow(p, now)) continue;
    const v = validateAutomaticPromotionApplication(p, lines, now, shippingCountryCode);
    if (!v.ok) continue;
    const b = computePromotionBenefitCents(
      p,
      lines,
      shippingCountryCode,
      shippingRatesCentsByCountry,
      freeShippingFromSubtotalGrossCents,
    );
    if (b > bestBenefit) {
      bestBenefit = b;
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
  shippingRatesCentsByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
}): ResolvedCheckoutPromotion {
  const codeNorm = normalizePromotionCode(input.promotionCode);

  const pt = (
    r: PromotionRecord,
  ): "order_discount" | "free_shipping" | "cheapest_item_percent" => {
    if (r.promotionType === "free_shipping") return "free_shipping";
    if (r.promotionType === "cheapest_item_percent") return "cheapest_item_percent";
    return "order_discount";
  };

  if (codeNorm.length > 0) {
    const v = validatePromotionCodeApplication(
      input.codePromotion,
      input.lines,
      input.now,
      input.shippingCountryCode,
    );
    if (!v.ok) {
      return { kind: "none" };
    }
    const p = input.codePromotion!;
    const discount = computePromotionDiscountOffSubtotalCents(p, input.lines, input.shippingCountryCode);
    const shippingSaved =
      p.promotionType === "free_shipping" &&
      isFreeShippingAllowedForCountry(p, input.shippingCountryCode)
        ? computeReferenceShippingGrossCents(
            input.lines,
            input.shippingCountryCode,
            input.shippingRatesCentsByCountry,
            input.freeShippingFromSubtotalGrossCents,
          )
        : 0;
    return {
      kind: "applied",
      promotionId: p.id,
      title: p.title,
      code: p.code,
      promotionType: pt(p),
      discountOffSubtotalCents: discount,
      shippingSavedCents: shippingSaved,
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
    input.shippingRatesCentsByCountry,
    input.freeShippingFromSubtotalGrossCents,
  );
  if (!best) {
    return { kind: "none" };
  }

  const discount = computePromotionDiscountOffSubtotalCents(
    best,
    input.lines,
    input.shippingCountryCode,
  );
  const shippingSaved =
    best.promotionType === "free_shipping" &&
    isFreeShippingAllowedForCountry(best, input.shippingCountryCode)
      ? computeReferenceShippingGrossCents(
          input.lines,
          input.shippingCountryCode,
          input.shippingRatesCentsByCountry,
          input.freeShippingFromSubtotalGrossCents,
        )
      : 0;

  const benefit = discount + shippingSaved;
  if (benefit <= 0) {
    return { kind: "none" };
  }

  return {
    kind: "applied",
    promotionId: best.id,
    title: best.title,
    code: best.code,
    promotionType: pt(best),
    discountOffSubtotalCents: discount,
    shippingSavedCents: shippingSaved,
    source: "automatic",
  };
}
