# Epic 7 — Agent-Handoff: Shipping & Returns

**Zielgruppe:** Cloud-/Cursor-Agent  
**Basis-Branch:** `main` (nach Epic 12)  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-7-shipping-and-returns)  
**Fachdokument:** [EPIC7_SHIPPING_RETURNS.md](./EPIC7_SHIPPING_RETURNS.md)  
**ADR:** [0009-fulfillment-shipments.md](./adr/0009-fulfillment-shipments.md)

---

## Abgrenzung

| Thema | Hinweis |
| --- | --- |
| Credentials | INTERNETMARKE / DHL **nicht** ohne Secrets starten |
| Checkout-Versandkosten | `/admin/versand` — anderes Modul (`ShopShippingSettings`) |
| Manueller Versand | `applyOrderStatusTransition(…, "shipped", { shipment })` bleibt gültig |
| Module | Neuer Bounded Context `features/fulfillment` |

---

## Ist-Zustand (nach Slice 1)

- Prisma `Shipment` + Status/Label-Provider-Enums
- Domäne: Shipment-Statusmaschine, Draft anlegen für geeignete Orders
- `ShippingLabelPort` + `NotConfiguredShippingLabelAdapter`
- Kein Provider-HTTP, kein neues Admin-UI für Sendungen

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic7-slice<N>-<kurzname>-2fb1`

| Slice | Inhalt | Exit | Credentials? |
| --- | --- | --- | --- |
| **1** | ADR-0009 + Schema + Domäne + Port-Stub | ✅ Migration; Unit-Tests; architecture:check | Nein |
| **2** | Sync mit Admin-„Versandt“ / Order-Denormalisierung | Shipment spiegelt manuellen Versand | Nein |
| **3** | INTERNETMARKE Adapter + Idempotenz + private Label-Keys | Kauf/Void gegen Sandbox/Test | **Ja** |
| **4** | Optional DHL Parcel | Zweiter Adapter | **Ja** |
| **5** | Retoure/Reship Admin-MVP + Tracking-UX | Auditierbar | Teilweise |

---

## Copy-Paste — nächster Agent (Slice 2)

```
Epic 7 Slice 2 auf main: Beim bestehenden Admin-Statuswechsel nach „shipped“
(applyOrderStatusTransition mit Carrier + Tracking) eine Shipment-Zeile
anlegen oder aktualisieren (features/fulfillment). Order.shippingCarrier /
trackingNumber bleiben denormalisiert. Kein Provider-HTTP.

Lies: docs/EPIC7_AGENT_HANDOFF.md, docs/adr/0009-fulfillment-shipments.md
Branch: cursor/epic7-slice2-manual-shipment-sync-2fb1
Tests: npm run validate (mind. typecheck + test:unit + architecture:check)
Antworten auf Deutsch.
```

---

## Nach Epic 7

- Epic 4 Stripe PaymentPort (ohne Live-Keys möglich)
- Epic 6 Zettle nur mit POS-Credentials
- Epic 9 Go-Live-Checkliste (Operator)
