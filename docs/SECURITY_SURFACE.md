# HTTP- und API-Oberfläche (Security Surface)

Lebendes Inventar für [Epic 10 in DELIVERY_PLAN_PHASE2](./DELIVERY_PLAN_PHASE2.md). Bei neuen Routen oder Server Actions ergänzen.

| Pfad / Art | Auth | Zweck (kurz) |
|------------|------|----------------|
| `GET/POST …/api/auth/[...nextauth]` | NextAuth | Login, Session, CSRF-Token; **POST** `…/callback/credentials`: Rate-Limit pro Client-IP (`lib/security/sign-in-rate-limit.ts`) |
| `GET /api/admin/search` | Admin-Session (`auth()`) | Globale Suche |
| `GET /api/admin/order-alerts` | Admin-Session | Bestell-Alerts |
| Server Actions `lib/cart/actions.ts` | Öffentlich (Cart-Cookie) | Warenkorb |
| Server Actions `app/(storefront)/checkout/actions.ts` | Öffentlich | Checkout |
| Server Actions `app/admin/.../orders/actions.ts` | `auth()` in Action | Bestellstatus |
| Server Actions `app/admin/.../products/actions.ts` | `auth()` in Action | Katalogpflege |
| Server Actions `app/admin/.../startseite/actions.ts` | `auth()` in Action | Startseite Marketing (Amazon-/Social-Inhalte) |
| Server Actions `app/admin/.../versand/actions.ts` | `auth()` in Action | Shopweite Versandländer und -kosten |
| `GET /llms.txt` | Öffentlich | KI-/Agenten-Hinweis (nur statischer Text, keine personenbezogenen Daten) |
| `GET /sitemap.xml` | Öffentlich | SEO-Sitemap (Produkt-URLs u. a.) |
| `GET /robots.txt` | Öffentlich | Crawler-Regeln inkl. Sitemap-Verweis |
| `GET /checkout/paypal-rueckkehr` | Öffentlich (Redirect von PayPal) | Nach erfolgreichem Capture: Bestellung `paid`, Lager, E-Mail ([PAYMENT_PROVIDER_STRATEGY](./PAYMENT_PROVIDER_STRATEGY.md)) |
| `POST /api/checkout/paypal/create-order` | Öffentlich (Checkout) | Bestellung anlegen + PayPal-Order; **Rate-Limit** pro IP (`lib/security/paypal-checkout-api-rate-limit.ts`) |
| `POST /api/checkout/paypal/capture-order` | Öffentlich (Checkout) | Capture nach Karte/Wallet; **gleiches Rate-Limit** wie create-order |
| Tabelle `order_payments` | — | PSP-Versuche pro Bestellung (Prisma-Modell `OrderPayment`) |
| Seiten unter `/admin/*` (außer Login) | Middleware + Layout `auth()` | Admin-UI |

**Hinweise**

- Admin-APIs: ohne gültige Session → **401 JSON** (siehe Integrationstests).
- Keine weiteren öffentlichen REST-Endpunkte für schreibende Shop-Daten außer Server Actions.
- Webhooks (z. B. Zahlungen, Epic 9): nach Einführung hier eintragen inkl. Signaturpflicht.
