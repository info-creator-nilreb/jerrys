# Edelweiss — Integrationen schrittweise anbinden

Zweiter Shop: Vercel-Projekt **`edelweiss`**, eigene Supabase-DB, eigene Secrets. Code ist derselbe wie jerry's; **Credentials nie kopieren**.

Admin-Status: Production-Admin → **Einstellungen → Integrationen**. Env-Dienste (E-Mail, PayPal, Blob) zeigen dort nur Diagnose — Werte setzt du in Vercel Production des Edelweiss-Projekts, danach Redeploy.

## Reihenfolge

| Schritt | Dienst | Wo | Pflicht für Verkauf |
| --- | --- | --- | --- |
| 1 | E-Mail (Resend) | Vercel Env | ja (Bestell-/Konto-Mails) |
| 2 | PayPal | Vercel Env + PayPal-Dashboard | ja (Online-Zahlung) |
| 3 | Medien (Vercel Blob) | Vercel Storage | ja (Logos/Produktbilder) |
| 4 | Internetmarke | Env App-Key + Admin Portokasse | Versandetiketten |
| 5 | Zettle | Admin API-Key | POS, falls Ladenkasse |
| 6 | Instagram | Env App + Admin OAuth | Feed, optional |
| 7 | KI / Suche | Env oder Admin-Key | optional |

## Schritt 1 — E-Mail

1. Resend: Domain **`edelweissdesigns.de`** verifizieren (DNS MX/TXT laut Resend).
2. Vercel → Projekt **edelweiss** → Settings → Environment Variables → **Production**:
   - `RESEND_API_KEY`
   - `MAIL_FROM_EMAIL` z. B. `info@edelweissdesigns.de`
   - `MAIL_FROM_NAME` z. B. `Edelweiss`
3. Redeploy. Admin → Integrationen: Status **Versand bereit**.
4. Smoke: Testbestellung oder Admin „E-Mail erneut senden“ — Absender muss die verifizierte Domain sein.

Nicht jerry's-`RESEND_API_KEY` mit jerry's-Absender nutzen.

## Schritt 2 — PayPal

Eigene PayPal-App (nicht die jerry's-App). Return-/Webhook-URLs müssen zur **Edelweiss-Domain** passen.

1. [PayPal Developer](https://developer.paypal.com/dashboard/) → App anlegen (zuerst Sandbox).
2. Vercel Production:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV=sandbox` (Tests) bzw. `live`
3. Webhook-URL (steht auch im Admin-Panel): `{NEXT_PUBLIC_SITE_URL}/api/webhooks/paypal`
   Events mindestens: `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`.
4. Webhook-ID als `PAYPAL_WEBHOOK_ID`. Redeploy.
5. Apple Pay: Domain im PayPal-Dashboard **exakt** wie Browser-Host registrieren.
6. `NEXT_PUBLIC_SITE_URL` und `AUTH_URL` auf dieselbe kanonische HTTPS-URL (ohne abweichendes www, sofern Apex kanonisch ist).

Live ohne Webhook: Capture nur über Return-URL — unsicher bei abgebrochenem Redirect. Admin zeigt **Live bereit** erst mit Credentials + Webhook + `PAYPAL_ENV=live`.

## Schritt 3 — Blob

Vercel → Storage → Blob (public) **am Edelweiss-Projekt**. Token `BLOB_READ_WRITE_TOKEN` nur dort. Ohne Token: Uploads fehl, Storefront fällt auf Static-Fallbacks zurück.

## Schritte 4–7 (Admin)

Nach Env-Grundlage unter **Einstellungen → Integrationen** verbinden:

- **Internetmarke:** `INTERNETMARKE_CLIENT_ID` / `INTERNETMARKE_CLIENT_SECRET` in Vercel, danach Portokasse im Admin + 1–5 Porto-Produkte. Zweite Freigabe in der Portokasse (Geschäftsanwendungen) ist Pflicht.
- **Zettle:** API-Key im Admin (Scopes READ/WRITE PRODUCT + READ PURCHASE). Webhook-URL: `{SITE}/api/webhooks/zettle`.
- **Instagram:** App-ID/Secret in Vercel, OAuth nur über Production-Admin. Redirect `{SITE}/api/admin/instagram/callback` in Meta eintragen.
- **KI / Suche:** OpenAI-Key in Env oder verschlüsselt im Admin; Suchindex danach neu aufbauen.

## Shop-URLs und Maintenance

| Variable | Edelweiss Production |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | kanonische Shop-URL (Custom Domain, sobald gesetzt) |
| `AUTH_URL` | dieselbe URL |
| `COMMERCE_MAINTENANCE_SITE_URL` | dieselbe URL (GitHub Action, nicht jerry's-Domain) |
| `COMMERCE_MAINTENANCE_SECRET` / `CRON_SECRET` | **eigene** Werte, nicht jerry's teilen |

Siehe auch [OPERATIONS.md](./OPERATIONS.md) (Migrationen beider Shops) und [PAYMENT_PROVIDER_STRATEGY.md](./PAYMENT_PROVIDER_STRATEGY.md).
