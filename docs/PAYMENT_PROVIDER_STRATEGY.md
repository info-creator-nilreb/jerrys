# Zahlungsanbieter-Strategie (Epic 9)

## Umsetzung jerry's (aktuell)

**PayPal** über die **Orders API v2** (Server-seitig mit Client ID + Secret, OAuth, Create Order, Redirect/Smart Buttons/Apple Pay, **Capture** nach Zustimmung):

- **PCI:** Zahlungsdaten verbleiben bei PayPal; der Shop leitet nur um.
- **Finalisierung:** `GET /checkout/paypal-rueckkehr?token=…` (PayPal Order ID) → Capture → Lagerabzug, Status `paid`, `OrderPayment` `succeeded` (`provider: "paypal"`).
- **Express Checkout:** Warenkorb nutzt PayPal JS SDK Smart Buttons (`components=buttons,applepay`). `POST /api/checkout/paypal/express-create` legt eine `pending_payment`-Shop-Order mit Platzhalteradresse und PayPal `shipping_preference=GET_FROM_FILE` an; `express-approve` übernimmt PayPal-/Apple-Pay-Lieferdaten und capturt über dieselbe Finalisierung (`eventSource: paypal_smart_buttons`).
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
2. ~~Teilzahlungen / Refunds im Admin.~~ → MVP: [EPIC4_REFUNDS.md](./EPIC4_REFUNDS.md) (PayPal voll/teilweise + manueller Fallback; Workshops über denselben Order-Pfad).
3. ~~Reconciliation.~~ → MVP: [EPIC4_RECONCILIATION.md](./EPIC4_RECONCILIATION.md) (Cron + Admin-Nachziehen + Refund-Webhook Vollrefund).
4. Stripe (Folge von Epic 4).

**Agent-Handoffs (nächste Produkt-Epics):** [EPIC11_AGENT_HANDOFF.md](./EPIC11_AGENT_HANDOFF.md), [EPIC12_AGENT_HANDOFF.md](./EPIC12_AGENT_HANDOFF.md).
