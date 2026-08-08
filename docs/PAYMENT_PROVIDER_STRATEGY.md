# Zahlungsanbieter-Strategie (Epic 9)

## Umsetzung jerry's (aktuell)

**PayPal** über die **Orders API v2** (Server-seitig mit Client ID + Secret, OAuth, Create Order, Redirect zur PayPal-Zustimmung, **Capture** nach Rückkehr):

- **PCI:** Zahlungsdaten verbleiben bei PayPal; der Shop leitet nur um.
- **Finalisierung:** `GET /checkout/paypal-rueckkehr?token=…` (PayPal Order ID) → Capture → Lagerabzug, Status `paid`, `OrderPayment` `succeeded` (`provider: "paypal"`).
- **Webhooks (Doppel-Absicherung):** `POST /api/webhooks/paypal` mit Signaturprüfung (`PAYPAL_WEBHOOK_ID`) für u. a. `PAYMENT.CAPTURE.COMPLETED` / `CHECKOUT.ORDER.APPROVED` → dieselbe Capture-/Finalize-Pipeline (Inbox-Idempotenz).
- **Umgebungsvariablen:** siehe [.env.example](../.env.example)
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENV`: `sandbox` (Standard) oder `live`
  - `PAYPAL_WEBHOOK_ID`: Webhook-ID aus dem PayPal Developer Dashboard (URL: `/api/webhooks/paypal`)

**Klarna** als Checkout-Zahlungsart ist keine direkte PayPal-Orders-Route: ohne weiteres PSP erfolgt kein Hosted-Redirect im gleichen Sinne (Demo: Sofortbestätigung `bestaetigt` wie bei rein lokalem Checkout).

Alternativen (nicht im Code): Stripe, Adyen, Mollie – jeweils eigene Vertrags- und Integrationspfade.

## Datenmodell

`OrderPayment` (Prisma) protokolliert Zahlungsversuche (`provider`, `providerRef`, `status`). Die gewählte **Checkout-Zahlungsart** (`orders.payment_method`: vorkasse, paypal, …) bleibt fachliche Vorauswahl.

## Nächste sinnvolle Schritte

1. PayPal-Live-Credentials und `PAYPAL_ENV=live` für Produktion; Webhook-URL + `PAYPAL_WEBHOOK_ID` in Preview/Production setzen.
2. Teilzahlungen / Refunds im Admin (separates Epic).
