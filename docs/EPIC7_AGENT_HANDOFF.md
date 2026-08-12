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
| Module | Bounded Context `features/fulfillment` |

---

## Ist-Zustand

### Slice 1
- Prisma `Shipment` + Status/Label-Provider-Enums
- Domäne: Shipment-Statusmaschine, Draft anlegen für geeignete Orders
- `ShippingLabelPort` + `NotConfiguredShippingLabelAdapter`

### Slice 2 + 3
- REST-Adapter INTERNETMARKE + Admin-Panel „Internetmarke kaufen/stornieren“ an der Bestellung
- Sync: manueller Admin-„Versandt“ schreibt/aktualisiert `shipments`
- Factory `createShippingLabelPortFromEnv()` — ohne Env → NotConfigured
- Env in `.env.example` / `.env.local` / Vercel (niemals committen)

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic7-slice<N>-<kurzname>-2fb1`

| Slice | Inhalt | Exit | Credentials? |
| --- | --- | --- | --- |
| **1** | ADR-0009 + Schema + Domäne + Port-Stub | ✅ Migration; Unit-Tests; architecture:check | Nein |
| **2** | Sync mit Admin-„Versandt“ / Order-Denormalisierung | ✅ `syncManualShipmentOnOrderShipped` | Nein |
| **3** | INTERNETMARKE Adapter + Admin Kauf/Void | ✅ Mock-HTTP; Env; Bestelldetail-Panel | **Ja** (Live) |
| **4** | Optional DHL Parcel | Zweiter Adapter | **Ja** |
| **5** | Retoure/Reship Admin-MVP + private Label-Keys | Auditierbar | Teilweise |

---

## Copy-Paste — nächster Agent (Slice 5 / private Labels)

```
Epic 7: Private Ablage für INTERNETMARKE-PDF (nicht öffentlicher Vercel-Blob).
Nach Label-Kauf PDF vom temporären Provider-Link laden, privat speichern,
labelStorageKey setzen. Admin-Download über geschützte Route.
Branch: cursor/epic7-slice5-private-label-storage-2fb1
Antworten auf Deutsch.
```

---

## INTERNETMARKE Ops (Kurz)

1. App im DHL Developer Portal anlegen → Client ID/Secret
2. Portokasse registrieren; für Dev: Entwickler-Portokasse via `it-csp@deutschepost.de`
3. In der Portokasse: **Geschäftsanwendungen** freigeben (sonst 401)
4. Produktcode + Cent-Preis aus aktueller PPL / Products API setzen
5. `pageFormatId` über `GET /app/catalog?types=PAGE_FORMATS` wählen
6. Env setzen → `createShippingLabelPortFromEnv()` liefert den Adapter
7. Health: `GET https://api-eu.dhl.com/post/de/shipping/im/v1/`

---

## Nach Epic 7

- Epic 4 Stripe PaymentPort (ohne Live-Keys möglich)
- Epic 6 Zettle nur mit POS-Credentials
- Epic 9 Go-Live-Checkliste (Operator)
