# HTTP- und API-Oberfläche (Security Surface)

Lebendes Inventar für [Epic 10 in DELIVERY_PLAN_PHASE2](./DELIVERY_PLAN_PHASE2.md). Bei neuen Routen oder Server Actions ergänzen.

| Pfad / Art | Auth | Zweck (kurz) |
|------------|------|----------------|
| `GET/POST …/api/auth/[...nextauth]` | NextAuth | Login, Session, CSRF-Token |
| `GET /api/admin/search` | Admin-Session (`auth()`) | Globale Suche |
| `GET /api/admin/order-alerts` | Admin-Session | Bestell-Alerts |
| Server Actions `lib/cart/actions.ts` | Öffentlich (Cart-Cookie) | Warenkorb |
| Server Actions `app/(storefront)/checkout/actions.ts` | Öffentlich | Checkout |
| Server Actions `app/admin/.../orders/actions.ts` | `auth()` in Action | Bestellstatus |
| Server Actions `app/admin/.../products/actions.ts` | `auth()` in Action | Katalogpflege |
| `GET /llms.txt` | Öffentlich | KI-/Agenten-Hinweis (nur statischer Text, keine personenbezogenen Daten) |
| `GET /sitemap.xml` | Öffentlich | SEO-Sitemap (Produkt-URLs u. a.) |
| `GET /robots.txt` | Öffentlich | Crawler-Regeln inkl. Sitemap-Verweis |
| `POST /api/webhooks/stripe` | Öffentlich (POST von Stripe) | Webhook-Stub → **501** bis Signatur + Verarbeitung implementiert ([PAYMENT_PROVIDER_STRATEGY](./PAYMENT_PROVIDER_STRATEGY.md)) |
| Tabelle `order_payments` | — | PSP-Versuche pro Bestellung (Prisma-Modell `OrderPayment`) |
| Seiten unter `/admin/*` (außer Login) | Middleware + Layout `auth()` | Admin-UI |

**Hinweise**

- Admin-APIs: ohne gültige Session → **401 JSON** (siehe Integrationstests).
- Keine weiteren öffentlichen REST-Endpunkte für schreibende Shop-Daten außer Server Actions.
- Webhooks (z. B. Zahlungen, Epic 9): nach Einführung hier eintragen inkl. Signaturpflicht.
