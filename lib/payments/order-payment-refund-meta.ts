/**
 * JSON-Metadaten auf `OrderPayment.metadata` für Capture- und Refund-Referenzen.
 */

export type OrderPaymentRefundEntry = {
  id: string;
  amountCents: number;
  idempotencyKey: string;
  at: string;
  actor?: string;
  note?: string;
};

export type OrderPaymentRefundMeta = {
  paypalCaptureId?: string;
  refundedCents?: number;
  refunds?: OrderPaymentRefundEntry[];
};

export function readOrderPaymentRefundMeta(metadata: unknown): OrderPaymentRefundMeta {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  const m = metadata as Record<string, unknown>;
  const out: OrderPaymentRefundMeta = {};

  if (typeof m.paypalCaptureId === "string" && m.paypalCaptureId.trim()) {
    out.paypalCaptureId = m.paypalCaptureId.trim();
  }

  if (typeof m.refundedCents === "number" && Number.isFinite(m.refundedCents) && m.refundedCents >= 0) {
    out.refundedCents = Math.floor(m.refundedCents);
  }

  if (Array.isArray(m.refunds)) {
    const refunds: OrderPaymentRefundEntry[] = [];
    for (const raw of m.refunds) {
      if (raw == null || typeof raw !== "object" || Array.isArray(raw)) continue;
      const r = raw as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : "";
      const amountCents =
        typeof r.amountCents === "number" && Number.isFinite(r.amountCents)
          ? Math.floor(r.amountCents)
          : NaN;
      const idempotencyKey = typeof r.idempotencyKey === "string" ? r.idempotencyKey : "";
      const at = typeof r.at === "string" ? r.at : "";
      if (!id || !idempotencyKey || !Number.isFinite(amountCents) || amountCents < 0) continue;
      refunds.push({
        id,
        amountCents,
        idempotencyKey,
        at: at || new Date(0).toISOString(),
        ...(typeof r.actor === "string" ? { actor: r.actor } : {}),
        ...(typeof r.note === "string" ? { note: r.note } : {}),
      });
    }
    if (refunds.length > 0) out.refunds = refunds;
  }

  return out;
}

export function mergeOrderPaymentRefundMeta(
  existing: unknown,
  patch: OrderPaymentRefundMeta,
): Record<string, unknown> {
  const base =
    existing != null && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const current = readOrderPaymentRefundMeta(base);
  const next: OrderPaymentRefundMeta = {
    ...current,
    ...patch,
    refunds: patch.refunds ?? current.refunds,
  };
  if (next.paypalCaptureId) base.paypalCaptureId = next.paypalCaptureId;
  if (typeof next.refundedCents === "number") base.refundedCents = next.refundedCents;
  if (next.refunds) base.refunds = next.refunds;
  return base;
}
