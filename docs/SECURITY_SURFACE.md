# HTTP- und API-Oberfläche (Security Surface)

Lebendes Inventar für [Epic 10 in DELIVERY_PLAN_PHASE2](./DELIVERY_PLAN_PHASE2.md). Bei neuen Routen oder Server Actions ergänzen.

| Pfad / Art | Auth | Zweck (kurz) |
|------------|------|----------------|
| `GET/POST …/api/auth/[...nextauth]` | NextAuth | Login, Session, CSRF-Token; **POST** `…/callback/credentials`: Admin-Rate-Limit (`lib/security/sign-in-rate-limit.ts`); **POST** `…/callback/customer-credentials` und `…/callback/customer-magic-link`: Kunden-Rate-Limit (`lib/security/customer-auth-rate-limit.ts`) |
| Server Actions `app/(storefront)/konto/actions.ts` | Öffentlich (Rate-Limit IP) | Kunden-Registrierung, Passwort-Login, Magic-Link-Anforderung, Passwort-Reset; Verifikation |
| `GET /konto/magic-link` | Öffentlich (One-Time-Token) | Magic-Link-Callback (Route Handler setzt Session-Cookie; ungültig → Redirect `/?konto=magic-…`) |
| Seiten `/konto/*` | Kunden-Session wo nötig (`getCustomerSession`) | Registrieren, Verifizieren, Reset; `/konto/anmelden` öffnet Header-Popover |
| Seiten `/konto`, `/konto/bestellungen`, `/konto/bestellungen/[orderNumber]` | Kunden-Session (`getCustomerSession`); Daten nur via `customerId` | Kundenportal; fremde Bestellung → **404** ohne Existenz-Leak |
| Seiten `/konto/adressen`, `/konto/adressen/neu`, `/konto/adressen/[addressId]` | Kunden-Session + verifizierte E-Mail | Adressbuch; fremde Adresse → **404** ohne Existenz-Leak |
| Server Actions `app/(storefront)/konto/address-actions.ts` | Kunden-Session (`getCustomerSession`) + verifizierte E-Mail in der Application-Schicht | Adressen anlegen, ändern, löschen, Standard setzen |
| Seite `/konto/bestellungen/zuordnen` | Kunden-Session + verifizierte E-Mail | Vorschau zuordenbarer Gastbestellungen (nur eigene, verifizierte E-Mail) |
| Server Actions `app/(storefront)/konto/guest-order-actions.ts` | Kunden-Session + verifizierte E-Mail; Bestätigungsfeld serverseitig geprüft | Gastbestellungen zuordnen; idempotent über `customerId: null`, Audit `order.customer_linked` |
| Seiten `/konto/termine`, `/konto/termine/[bookingId]` | Kunden-Session + verifizierte E-Mail; Buchungen nur via `customerId` | Terminbuchungen; fremde Buchung → **404** ohne Existenz-Leak |
| Server Actions `app/(storefront)/konto/workshop-booking-actions.ts` | Kunden-Session + verifizierte E-Mail; Bestätigungsfeld serverseitig | Selbststornierung; Frist serverseitig; idempotent; Audit `workshop.booking.self_cancelled` |
| Seiten `/termine`, `/termine/[sessionId]` | Öffentlich | Veröffentlichte kommende Gruppentermine; Verfügbarkeit serverseitig |
| `POST /api/workshop/start-checkout` | Öffentlich (Form-POST von Termin-Detail) | Platz-Hold anlegen, Cookie setzen, **HTTP 303** → `/checkout/termine` (MPA, kein Server-Action-Redirect — vermeidet React #441) |
| `POST /api/workshop/complete-checkout` | Öffentlich (Form-POST von Termin-Checkout) | Workshop-Order anlegen; **HTTP 303** → Erfolg oder PayPal-Approval (MPA) |
| Seite `/konto/datenschutz` | Kunden-Session + verifizierte E-Mail | Auskunft, Berichtigung, Konto-Löschung (Art. 15/16/17 DSGVO) |
| `GET /konto/datenschutz/export` | Kunden-Session + verifizierte E-Mail; **kein** Parameter für fremde Konten | Datenauskunft als JSON-Download; ohne Passwort-Hash und Token; **Rate-Limit** pro IP (`lib/security/customer-privacy-rate-limit.ts`) |
| Server Actions `app/(storefront)/konto/privacy-actions.ts` | Kunden-Session + verifizierte E-Mail; Löschung nur mit serverseitig geprüftem Bestätigungswort | Namen berichtigen, Konto anonymisieren (Audit `order.customer_unlinked`, danach Sign-out) |
| `GET /api/admin/search` | Admin-Session (`auth()`) | Globale Suche |
| `GET /api/storefront/product-suggest` | Öffentlich | Typeahead-Produktvorschläge (`q`, min. 2 Zeichen); **Rate-Limit** pro IP (`lib/security/storefront-search-api-rate-limit.ts`) |
| `GET /api/storefront/address-suggest` | Öffentlich | Adressvorschläge für Checkout und Adressbuch (`land`, `plz`, `ort`, `strasse`); ausschließlich Proxy auf OpenPLZ API (DE/AT/CH/LI), keine Shop-Daten; **Rate-Limit** pro IP (`lib/security/address-suggest-api-rate-limit.ts`) |
| `GET /api/admin/order-alerts` | Admin-Session | Bestell-Alerts |
| `GET /api/admin/orders/[id]/invoice` | Admin-Session | Rechnungs-PDF (falls `invoiceNumber` gesetzt); sonst 404 |
| Server Actions `lib/cart/actions.ts` | Öffentlich (Cart-Cookie) | Warenkorb |
| Server Actions `app/(storefront)/checkout/actions.ts` | Öffentlich | Checkout |
| Server Actions `app/admin/.../orders/actions.ts` | `auth()` in Action | Bestellstatus |
| Server Actions `app/admin/.../products/actions.ts` | `auth()` in Action | Katalogpflege |
| Server Actions `app/admin/.../categories/actions.ts` | `auth()` in Action | Kategorie-CRUD, Produktzuordnung |
| Server Actions `app/admin/.../versand/actions.ts` | `auth()` in Action | Shopweite Versandländer und -kosten |
| Seite `/admin/einstellungen` | Admin-Session | Shop-Branding, Kontakt, Farben, Medien-Uploads (Epic 11) |
| Seite `/admin/einstellungen/integrationen` | Admin-Session | Instagram-OAuth + Internetmarke + Zettle POS + KI-Content (OpenAI) |
| Server Actions `app/admin/.../einstellungen/actions.ts` | `auth()` in Action | ShopSettings speichern; Branding-Upload/Clear (Vercel Blob); Audit via Outbox `shop_settings.*` |
| Server Actions `app/admin/.../einstellungen/integrationen/instagram-actions.ts` | Admin-Session | Instagram trennen / manueller Sync |
| Server Actions `app/admin/.../einstellungen/integrationen/internetmarke-actions.ts` | Admin-Session | Portokasse verbinden, Produkt wählen, trennen |
| Server Actions `app/admin/.../einstellungen/integrationen/zettle-actions.ts` | Admin-Session | Zettle-API-Key verbinden, Varianten-Mapping, Kauf-Sync/Retry, trennen |
| Server Actions `app/admin/.../einstellungen/integrationen/ai-actions.ts` | Admin-Session | OpenAI-Key (AES-GCM), Modellprofile, Tageslimit; Verify via GET `/v1/models`; kein Key im Client |
| Server Actions `app/admin/.../products/ai-product-text-actions.ts` | Admin-Session | KI-Textentwurf aus Allowlist-Fakten; keine Persistenz/Publish — Übernahme nur clientseitig ins Formular |
| Seiten `/admin/inhalte`, `/admin/inhalte/new`, `/admin/inhalte/[id]/edit`, `/admin/inhalte/marketing` | Admin-Session | CMS-light inkl. Live-Vorschau (Client); Marketing Reviews/Social; `/admin/startseite` → Redirect Marketing |
| Server Actions `app/admin/.../inhalte/actions.ts` | `auth()` in Action | ContentPage + ContentBlocks speichern; Publish/Unpublish; Rich-Text sanitize; Outbox `content_page.*` / `content_page.published` / `content_page.unpublished` |
| Server Actions `app/admin/.../inhalte/marketing/actions.ts` | `auth()` in Action | Homepage Amazon-/Social-Pflege (früher `/admin/startseite`) |
| `GET /api/admin/instagram/connect` | Admin-Session | Start Instagram OAuth (State-Cookie) |
| `GET /api/admin/instagram/callback` | Admin-Session + OAuth-State | Code→Token, verschlüsselte Persistenz, Erst-Sync |
| Seite `/vorschau/inhalte/[pageId]` | Signiertes Query-Token (`CONTENT_PREVIEW_SECRET` oder `AUTH_SECRET`), TTL 30 min | CMS-Vorschau (Draft/Published); **noindex**; ungültig/abgelaufen → **404**; kein Session-Auth-Leak |
| Catch-all `/(storefront)/[...slug]` | Öffentlich; nur `published` ContentPages | Freie CMS-URLs; Drafts → **404**; `previousSlug` → **301**; reservierte Systempfade → **404**; statische Routen (`/produkte`, `/impressum`, …) haben Vorrang |
| Lesepfade Storefront/E-Mail/PDF/Admin-Login | Öffentlich bzw. serverseitig | `getShopSettings()` + Static-Fallbacks `/branding/*`; keine freie CSS/JS aus Admin-Eingaben (nur Hex-Farben, URLs, Text via Zod) |
| Seiten `/admin/termine`, `/admin/termine/neu`, `/admin/termine/[id]/edit` | Admin-Session | Gruppentermine (Entwurf, Veröffentlichen, Absage); globale Storno-Frist |
| Server Actions `app/admin/(dashboard)/termine/actions.ts` | `auth()` in Action | Termin-CRUD (nur Entwürfe), Lifecycle, Shop-Workshop-Einstellungen; Audit `workshop.session.*` |
| `GET /llms.txt` | Öffentlich | KI-/Agenten-Hinweis (nur statischer Text, keine personenbezogenen Daten) |
| `GET /sitemap.xml` | Öffentlich | SEO-Sitemap (Produkt-URLs u. a.) |
| `GET /robots.txt` | Öffentlich | Crawler-Regeln inkl. Sitemap-Verweis |
| `GET /checkout/paypal-rueckkehr` | Öffentlich (Redirect von PayPal) | Nach erfolgreichem Capture: Bestellung `paid`, Lager, E-Mail ([PAYMENT_PROVIDER_STRATEGY](./PAYMENT_PROVIDER_STRATEGY.md)) |
| `POST /api/checkout/paypal/create-order` | Öffentlich (Checkout) | Bestellung anlegen + PayPal-Order; **Rate-Limit** pro IP (`lib/security/paypal-checkout-api-rate-limit.ts`) |
| `POST /api/checkout/paypal/capture-order` | Öffentlich (Checkout) | Capture nach Karte/Wallet; **gleiches Rate-Limit** wie create-order |
| `POST /api/webhooks/paypal` | Öffentlich (PayPal) | PayPal-Webhooks; **Signaturpflicht** (`PAYPAL_WEBHOOK_ID` + verify-webhook-signature); Inbox-Idempotenz (`paypal_webhook` / Event-ID); Rate-Limit pro IP (`lib/security/paypal-webhook-api-rate-limit.ts`); ohne Webhook-ID → **503**; Events u. a. Capture-Complete/Approve + `PAYMENT.CAPTURE.REFUNDED` |
| `GET`/`POST /api/internal/commerce-maintenance` | Bearer `CRON_SECRET` (Vercel Cron), Bearer/`x-commerce-maintenance-secret` (`COMMERCE_MAINTENANCE_SECRET`) | Bestandsreservierungen, Outbox, Workshops, PayPal-Reconciliation, Instagram-Feed-Sync, Zettle-Kauf-Pull (wenn verbunden) |
| `POST /api/webhooks/zettle` | Öffentlich (Zettle Pusher); HMAC `X-iZettle-Signature` | `PurchaseCreated` → idempotente POS-Bestandsbuchung; Inbox `zettle_pusher` |
| Tabelle `order_payments` | — | PSP-Versuche pro Bestellung (Prisma-Modell `OrderPayment`) |
| Seiten unter `/admin/*` (außer Login) | Middleware + Layout `auth()` | Admin-UI |

**Hinweise**

- **CSP:** `Content-Security-Policy` nur bei **Production-Build** (`NODE_ENV=production`), nicht bei `next dev` (HMR). Konfiguration: [`lib/site/content-security-policy.ts`](../lib/site/content-security-policy.ts), Header in [`next.config.ts`](../next.config.ts). `upgrade-insecure-requests` zusätzlich nur bei `VERCEL=1`.
- **Epic 11 Branding:** Primärfarben werden als Inline-CSS-Variablen gesetzt (`--primary` / `--primary-hover`); WCAG-Kontrast wird beim Speichern **gewarnt**, nicht hart blockiert (bestehendes jerry’s-Grün). Blob-URLs nur nach serverseitiger MIME-/Größen-/Magic-Byte-Prüfung.
- Admin-APIs: ohne gültige Session → **401 JSON** (siehe Integrationstests).
- Keine weiteren öffentlichen REST-Endpunkte für schreibende Shop-Daten außer Server Actions.
- PayPal-Webhooks: Signatur über PayPal Postback; Replay über `webhook_inbox_entries` (`provider: paypal_webhook`). Capture-Finalisierung zusätzlich über `provider: paypal` / `capture:<orderId>` in `completePayPalCaptureFlow`.
