# Epic 4 — PayPal-Refunds (Produkte & Workshops)

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-4-stripe-paypal-and-refunds), [PAYMENT_PROVIDER_STRATEGY.md](./PAYMENT_PROVIDER_STRATEGY.md)

## Status: MVP umgesetzt (PayPal voll/teilweise; manuell ohne PSP)

**Nicht im MVP:** Stripe, automatische Reconciliation-Reports, Refund-Webhooks als alleinige Autorität.

## Verhalten

1. **Capture speichert Capture-ID** in `order_payments.metadata.paypalCaptureId` (via `finalizeOrderAfterPendingPaymentCapture`).
2. **Admin** unter Bestelldetail → „Rückerstattung“:
   - Mit PayPal-Capture: Teil- oder Vollrefund über `POST /v2/payments/captures/{id}/refund` (`PayPal-Request-Id` = Idempotenz).
   - Ohne PayPal: nur vollständige manuelle Markierung `orders.status = refunded`.
3. **Shop-Status** wechselt auf `refunded` erst nach erfolgreichem Provider-Refund (Vollbetrag) bzw. manueller Bestätigung — nie rein optimistisch.
4. **Zahlungszeile:** `succeeded` → `partially_refunded` → `refunded`; Beträge in `metadata.refundedCents` / `metadata.refunds[]`.
5. **Workshops:** Selbststorno, Admin-Storno und Terminabsage rufen denselben Pfad (`issueOrderRefund` / `tryRefundWorkshopBookingOrder`) auf. Buchungsstorno bleibt erfolgreich, auch wenn der Refund fehlschlägt (Hinweis + manuell über Bestellung).

## Kerncode

| Thema | Ort |
| --- | --- |
| Domain | `lib/orders/issue-order-refund.ts` |
| PayPal API | `lib/payments/paypal-refunds.ts` |
| Metadata | `lib/payments/order-payment-refund-meta.ts` |
| Admin Action/UI | `issueOrderRefundAction`, `OrderRefundButton` |
| Workshop | `features/workshops/application/workshop-booking-refund.ts` |

## Tests

```bash
npm run test:unit -- tests/unit/payment-status-machine.test.ts tests/unit/order-status-machine.test.ts tests/unit/paypal-refund-parse.test.ts tests/unit/order-payment-refund-meta.test.ts tests/unit/issue-order-refund.test.ts
```
