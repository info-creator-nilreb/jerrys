# Epic 4 — PayPal Reconciliation

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-4-stripe-paypal-and-refunds), [QUALITY_GUARDRAILS.md](./QUALITY_GUARDRAILS.md), [OPERATIONS.md](./OPERATIONS.md#runbook-extern-bezahlt-intern-nicht-finalisiert)

## Status: MVP umgesetzt

Erkennt und behebt den Fall **extern bei PayPal erfolgreich / intern noch `pending_payment`**.

## Verhalten

1. **Batch (Cron):** `GET`/`POST /api/internal/commerce-maintenance` ruft `reconcilePendingPayPalPayments` auf (bis 25 offene PayPal-Bestellungen).
2. Pro Kandidat: PayPal Order GET → bei `APPROVED`/`COMPLETED` derselbe Capture-/Finalize-Pfad wie Return-URL/Webhook (`eventSource: paypal_reconciliation`).
3. **Admin:** Bestelldetail (Status Zahlung ausstehend + PayPal-Zahlungszeile) → „Zahlung bei PayPal nachziehen“.
4. **Webhook:** `PAYMENT.CAPTURE.REFUNDED` → bei erkennbarer Vollerstattung Shop-Status `refunded` (Teilerstattung nur geloggt; Detail-Persistenz im Refund-MVP).

## Antwortfelder Maintenance

```json
{
  "paypalReconcile": {
    "scanned": 3,
    "finalized": 1,
    "stillOpen": 1,
    "failed": 0,
    "skipped": 1
  }
}
```

## Kerncode

| Thema | Ort |
| --- | --- |
| Domain | `lib/orders/reconcile-pending-paypal-payments.ts` |
| Snapshot | `getPayPalCheckoutOrderSnapshot` in `lib/payments/paypal-orders.ts` |
| Refund-Webhook | `lib/orders/apply-paypal-capture-refunded-webhook.ts` |
| Admin | `OrderPayPalReconcileButton` / `reconcilePayPalPaymentForOrderAction` |

## Nicht im Slice

- Stripe
- Automatischer Report/E-Mail an Ops bei `failed > 0`
- Teilerstattungs-Metadata (siehe Refund-PR / [EPIC4_REFUNDS.md](./EPIC4_REFUNDS.md) wenn gemergt)
