# Epic 7 — Shipping and Returns

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-7-shipping-and-returns)  
**ADR:** [0009-fulfillment-shipments.md](./adr/0009-fulfillment-shipments.md)  
**Agent-Handoff:** [EPIC7_AGENT_HANDOFF.md](./EPIC7_AGENT_HANDOFF.md)

## Zielbild

Admins erzeugen Sendungen zu bezahlten Warenbestellungen, kaufen/voiden Labels (INTERNETMARKE, optional DHL Parcel), Kunden erhalten Tracking; Retouren und erneute Versendung sind auditierbar. Zahlung und Fulfillment bleiben getrennte Achsen.

## Abgrenzung

| Thema | Hinweis |
| --- | --- |
| `/admin/versand` | Bleibt **Versandkosten/Länder** (Checkout) — kein Label-UI |
| `/admin/einstellungen/integrationen` | Internetmarke-Credentials + Porto-Produkt; Instagram-OAuth |
| Manueller Versand heute | Carrier + Tracking auf Order-Status `shipped` bleibt bis Sync-Slice gültig |
| Workshops | Keine Pflicht-Sendung für reine Terminbuchungen |
| Provider-HTTP | Erst mit Credentials (Slice 2+) |

## Vorgeschlagene Slices

1. **ADR + Domäne:** `Shipment`, Statusmaschine, `ShippingLabelPort` Stub, `createShipmentDraftForOrder` — **kein** Provider-HTTP, **kein** neues Admin-UI. **Status:** umgesetzt (Slice 1).
2. **Manual sync:** Beim bestehenden Admin-„Versandt“ optional/automatisch `Shipment` anlegen/aktualisieren; Order-Felder bleiben denormalisiert.
3. **INTERNETMARKE:** REST-Adapter + `purchaseShippingLabelForShipment` / `voidShippingLabelForShipment`; Env-Credentials; Idempotenz über `shopOrderId`. **Status:** Adapter umgesetzt (Slice 3) — Admin-UI und privater Label-Blob folgen.
4. **DHL Parcel (optional):** Zweiter Adapter; Produktauswahl/Regeln. **Ohne EKP:** [Slice 4B Konzept](./EPIC7_SLICE4B_DHL_PRIVATE_SHIPPING.md); **mit EKP:** Paket DE Versenden V2 (Slice 4A).
5. **Kunde:** Versand-Mail/Tracking (bestehende Mail pflegen); Retoure/Reship Admin-MVP.

## Exit-Kriterien (Epic)

1. Label-Kauf ist idempotent; Void verhindert Doppelbelastung.
2. Tracking und Refunds bleiben auditierbar und von Zahlungsstatus getrennt.
3. Geschützte Label-Dateien haben Aufbewahrungsregeln.
4. Manueller Fallback ohne Provider bleibt möglich.

## Nicht-Ziele (v1)

- Multi-Warehouse / Carrier-Shop-Auswahl für Kunden
- Vollautomatische Retourenportale Dritter
- Marketplace-Fulfillment
