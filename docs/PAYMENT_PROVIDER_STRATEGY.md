# Zahlungsanbieter-Strategie (Epic 9)

## Umsetzung jerry's (aktuell)

**PayPal** über die **Orders API v2** (Server-seitig mit Client ID + Secret, OAuth, Create Order, Redirect zur PayPal-Zustimmung, **Capture** nach Rückkehr):

- **PCI:** Zahlungsdaten verbleiben bei PayPal; der Shop leitet nur um.
- **Finalisierung:** `GET /checkout/paypal-rueckkehr?token=…` (PayPal Order ID) → Capture → Lagerabzug, Status `paid`, `OrderPayment` `succeeded` (`provider: "paypal"`).
- **Optional später:** PayPal-Webhooks (`PAYMENT.CAPTURE.COMPLETED` o. Ä.) mit Signaturprüfung ergänzend zur Return-URL (Doppel-Absicherung, async Edge Cases).
- **Umgebungsvariablen:** siehe [.env.example](../.env.example)
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENV`: `sandbox` (Standard) oder `live`

**Klarna** als Checkout-Zahlungsart ist keine direkte PayPal-Orders-Route: ohne weiteres PSP erfolgt kein Hosted-Redirect im gleichen Sinne (Demo: Sofortbestätigung `bestaetigt` wie bei rein lokalem Checkout).

Alternativen (nicht im Code): Stripe, Adyen, Mollie – jeweils eigene Vertrags- und Integrationspfade.

## Datenmodell

`OrderPayment` (Prisma) protokolliert Zahlungsversuche (`provider`, `providerRef`, `status`). Die gewählte **Checkout-Zahlungsart** (`orders.payment_method`: vorkasse, paypal, …) bleibt fachliche Vorauswahl.

## Nächste sinnvolle Schritte

1. PayPal-Live-Credentials und `PAYPAL_ENV=live` für Produktion.
2. Webhook-Endpunkt mit PayPal-Signaturprüfung (falls gewünscht).
3. Teilzahlungen / Refunds im Admin (separates Epic).
