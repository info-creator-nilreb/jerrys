# Zahlungsanbieter-Strategie (Epic 9)

## Empfehlung für jerry's (V1)

**Stripe** als Payment Service Provider (PSP): Payment Element / Checkout Session deckt Karten, ggf. **Link**, **PayPal** und **Klarna** (Verfügbarkeit je Markt und Aktivierung im Stripe-Dashboard) unter einer Integration und klaren Webhooks ab.

- **PCI:** Kartendaten nicht auf eigenem Server; Nutzung von Stripe.js / hosted flows.
- **Webhooks:** Signaturprüfung mit `STRIPE_WEBHOOK_SECRET`; idempotente Verarbeitung (Event-IDs).
- **Umgebungsvariablen (Orientierung):**
  - `STRIPE_SECRET_KEY` (Server)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Client, nur Publishable)
  - `STRIPE_WEBHOOK_SECRET` (Webhook-Endpunkt)

Alternativen (nicht im Code vorgegeben): Adyen, Mollie, PayPal Commerce Platform – jeweils eigene Vertrags- und Integrationspfade.

## Datenmodell

`OrderPayment` (siehe Prisma) protokolliert pro Bestellung Zahlungsversuche und PSP-Referenzen (`provider`, `providerRef`, `status`). Die gewählte **Checkout-Zahlungsart** (`orders.payment_method`: vorkasse, paypal, …) bleibt fachliche Vorauswahl; der PSP-Status ergänzt den technischen Zahlungsfluss.

## Nächste Implementierungsschritte

1. Stripe SDK / REST anbinden, Session nach Order-Erstellung oder davor (fachliche Entscheidung).
2. Webhook-Route signaturprüfend implementieren (derzeit Stub unter `/api/webhooks/stripe`).
3. Order-Status-Maschine mit `paid` o. Ä. abstimmen (aktuell u. a. `bestaetigt`).
