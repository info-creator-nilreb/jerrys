# Epic 7 — Slice 4B: DHL Private Shipping (ohne Geschäftskundenkonto)

**Status:** Machbarkeitskonzept (nicht implementiert)  
**Basis:** [EPIC7_SHIPPING_RETURNS.md](./EPIC7_SHIPPING_RETURNS.md) · [ADR-0009](./adr/0009-fulfillment-shipments.md)  
**Zielgruppe:** Product/Ops + Implementierung  
**API-Referenz:** [DHL Parcel DE Private Shipping](https://developer.dhl.com/api-reference/dhl-parcel-de-private-shipping-post-parcel-germany)

---

## Kurzfassung

| Frage | Antwort |
| --- | --- |
| Geht DHL-Paket **ohne EKP/GKP**? | Ja — über **Private Shipping API** (Online Franking), nicht über „Paket DE Versenden V2“. |
| Wie „analog Internetmarke“? | Architektur ja (`ShippingLabelPort`, `Shipment`, Admin an Bestellung) — **UX nein**: Zahlung per Redirect zu DHL, nicht Portokasse-Guthaben. |
| Was deckt Internetmarke schon ab? | Briefe, Großbrief, Warenpost (S/M/L), ggf. internationale Produkte — **kein** volles DHL-Paket 2/5/10 kg mit Paket-Tracking. |
| Empfehlung jerry's (kein EKP) | **Warenpost** über Internetmarke für leichte Sendungen; **Private Shipping** für echte Pakete; manueller Fallback bleibt. |

---

## 1. Abgrenzung: Brief vs. Warenpost vs. DHL-Paket

### INTERNETMARKE (heute live)

- **Zweck:** Frankierung über **Portokasse** (Deutsche Post / Post & Paket-Produkte im IM-Katalog).
- **Typische Produkte** (aus Products API, Profil `IM-PARTNER`):
  - Standardbrief, Kompaktbrief, Großbrief, Maxibrief
  - **Warenpost** (national/international, Größen S/M/L — Namen im Katalog z. B. „Warenpost S“)
  - Keine vollwertigen **DHL Paket 2 kg / 5 kg / 10 kg** mit DHL-Paket-Tracking
- **Grenzen:** `maxWeightG` pro Produkt aus Katalog; Maße (L×B×H) werden im Admin **nicht** geprüft — nur Produktwahl.
- **Bezahlung:** Portokasse-Guthaben, synchroner Kauf (`directCheckout=true`).

### DHL Paket DE Versenden V2 (Slice 4A — **nicht** für dieses Konzept)

- **Voraussetzung:** DHL-Geschäftskundenvertrag, EKP, GKP, Abrechnungsnummern.
- **UX:** Am nächsten an Internetmarke (API-Label direkt).
- **Epic-Enum:** `dhl_parcel` in ADR — gedacht für **4A**, wenn EKP vorhanden.

### DHL Private Shipping (Slice 4B — **dieses Konzept**)

- **Zielgruppe:** Versender **ohne EKP**, typisch **&lt; 200 Sendungen/Jahr**.
- **Produkte:** DHL Paket, DHL Päckchen, ExpressEasy, ggf. international + Zoll.
- **Bezahlung:** Admin wird zu **DHL Online Franking** (`entryUrl`) weitergeleitet; Zahlung dort.
- **Nach Zahlung:** `notifyUrl`-Callback → Cart laden → Label/QR + Tracking (`PAKID`).

---

## 2. Wann welcher Kanal?

```
                    ┌─────────────────────────────────────┐
                    │  Bestellung bereit zum Versand      │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
     Gewicht/Maße passen        Zu schwer / zu groß      Kein Label-API
     zu Warenpost/Brief        für Warenpost           gewünscht
              │                       │                       │
              ▼                       ▼                       ▼
     INTERNETMARKE              DHL Private            Manuell
     (Portokasse)               Shipping               (Carrier + Tracking)
```

### Heuristik (Vorschlag v1)

| Signal | Quelle heute | INTERNETMARKE | DHL Private |
| --- | --- | --- | --- |
| Gewicht ≤ Warenpost-Limit | Products API `maxWeightG` am gewählten Preset | ✓ | optional |
| Gewicht &gt; 1 kg oder unbekannt | Order hat **kein** Summengewicht in DB | manuell wählen | ✓ eher |
| Admin wählt Produkt | Presets (1–5) | Brief/Warenpost | Paket-Presets (neu) |
| Empfängerland ≠ DE | Order `shippingCountry` | int. IM-Produkte | Private Shipping int. |

**Lücke im Ist-Stand:** Produkte haben nur `weightText` (Freitext), **kein** numerisches Gewicht pro Variante. Automatische Routing-Regeln brauchen entweder:

- manuelle Admin-Wahl (wie heute bei Internetmarke), oder
- später: `weightGrams` an `ProductVariant` + Summe aus Order-Positionen.

---

## 3. Architektur — Anbindung an bestehenden Code

### Bereits vorhanden

```
features/fulfillment/
  application/shipping-label-port.ts     ← Port: purchaseLabel / voidLabel
  application/purchase-shipping-label-for-shipment.ts
  infrastructure/internetmarke-*         ← Referenz-Adapter
  domain/shipment-status-machine.ts
prisma: Shipment.labelProvider enum      ← internetmarke | dhl_parcel | none
Admin: order-internetmarke-panel.tsx     ← Kauf/Void UI
Admin: integrationen/internetmarke-*   ← Credentials + Presets
```

### Erweiterung Slice 4B (Vorschlag)

```
features/fulfillment/
  infrastructure/dhl-private-shipping-client.ts
  infrastructure/dhl-private-shipping-label-adapter.ts
  infrastructure/dhl-private-connection.ts          ← DB wie Internetmarke
  domain/dhl-private-product-presets.ts
  domain/shipping-channel-rules.ts                  ← optional: IM vs DHL
  application/complete-dhl-private-label-purchase.ts  ← nach notifyUrl

app/api/webhooks/dhl-private-shipping/route.ts      ← notifyUrl (GET)
app/admin/.../integrationen/dhl-private-*           ← Settings
app/admin/.../orders/order-shipping-label-panel.tsx ← vereinheitlicht oder Tab
```

### Port-Anpassung (wichtig)

Der heutige `ShippingLabelPort.purchaseLabel` ist **synchron** (Erfolg → sofort `externalRef` + `labelDownloadUrl`).

Private Shipping ist **zweiphasig**:

| Phase | Aktion | Shipment-Status |
| --- | --- | --- |
| 1 | Cart anlegen, `entryUrl` zurück | `draft` + `labelCheckoutPending: true` (neu) oder Metadaten-JSON |
| 2 | Admin zahlt bei DHL | — |
| 3 | `notifyUrl` → Cart abrufen → Label | `labeled` |

**Option A (empfohlen):** Port um async Result erweitern:

```typescript
type PurchaseShippingLabelResult =
  | { ok: true; kind: "completed"; externalRef; trackingNumber; labelDownloadUrl }
  | { ok: true; kind: "payment_required"; checkoutUrl; providerCartId; notifyToken }
  | { ok: false; ... };
```

**Option B:** Separater Application-Use-Case `startDhlPrivateLabelCheckout` neben `purchaseShippingLabelForShipment` — weniger Bruch im Port, mehr Duplikat-Logik.

Internetmarke-Adapter bleibt `kind: "completed"`.

---

## 4. Admin-Flow (UX)

### 4.1 Integrationen (einmalig)

Analog Internetmarke-Panel:

1. **Env:** `DHL_PRIVATE_SHIPPING_API_KEY` (= Developer-Portal API Key, oft derselbe wie IM).
2. **DB:** `DhlPrivateShippingConnection` (Singleton):
   - `notifyUrlBase` (öffentliche HTTPS-URL des Shops)
   - `productPresets` (1–5 Paketprodukte aus Private-Product-Catalog)
   - `verifiedAt` / `lastError`
3. **Ops:** `notifyUrl` bei DHL per **Service-Ticket** registrieren (Pflicht laut Doku).
4. Produktkatalog **täglich** synchronisieren (nicht pro Checkout — DHL-Empfehlung).

### 4.2 Bestellung → Versand

**Schritt 1 — Kanal wählen** (wenn beide konfiguriert):

```
○ Internetmarke (Brief / Warenpost)     ← bestehend
○ DHL Paket (Online Franking)           ← neu
```

**Schritt 2a — Internetmarke:** unverändert (Preset → „Internetmarke kaufen“).

**Schritt 2b — DHL Private:**

1. Admin wählt Paket-Preset (z. B. „DHL Paket 2 kg“).
2. Klick **„Bezahlen bei DHL“** → Server legt Shopping Cart an.
3. UI zeigt Hinweis: *„Sie werden zu DHL weitergeleitet. Nach der Zahlung kehren Sie zurück; das Label wird automatisch geladen.“*
4. Redirect zu `entryUrl` (neuer Tab oder Same-Tab).
5. Nach Zahlung: DHL ruft `notifyUrl` auf; parallel kann Admin zur Bestellung zurück navigieren.
6. UI pollt oder revalidiert → Status **Label erstellt**, Link PDF/QR, Tracking.

**Fehler-UX:** wie Internetmarke — `explainDhlPrivateFailure`, Links zu DHL-Hilfe, **kein** roher JSON-Code.

---

## 5. Callback-Route (`notifyUrl`)

### Endpoint

```
GET /api/webhooks/dhl-private-shopping?token={uuid}
```

- `token`: kryptografisch zufällig, pro Cart in DB (`DhlPrivateCheckoutSession`), ≥ 128 Bit Entropie.
- **Idempotent:** mehrfacher GET darf Label nicht doppelt buchen.
- Antwort: `200 OK` schnell; schwere Arbeit async oder synchron mit Timeout-Risiko abwägen (Vercel).

### Ablauf (Server)

```
1. token → CheckoutSession laden (shipmentId, shoppingCartId, status=pending)
2. GET /shopping-carts/{shoppingCartId} (Private Shipping API)
3. Status = paid? → Label-Endpoints mit PAKID → PDF/Tracking
4. shipment.update: status=labeled, labelProvider=dhl_parcel, labelExternalRef, trackingNumber
5. Session status=completed, token invalidieren
6. Optional: Order-Versand-Mail mit Tracking (Slice 5)
```

### Sicherheit

- Token nicht erratbar; nur DHL-Notify + Admin mit Session.
- Kein Label-Kauf = Zahlungserfolg (weiterhin getrennte Achsen Payment Order vs. Porto).
- Logging ohne Secrets; `PAKID` in Audit.

---

## 6. Datenmodell (Vorschlag)

```prisma
model DhlPrivateShippingConnection {
  id              String   @id @default("default")
  apiKeyEncrypted String?  // optional mirror Env
  productPresets  Json     @default("[]")
  notifyUrlRegistered Boolean @default(false)
  verifiedAt      DateTime?
  lastError       String?
  // ...
}

model DhlPrivateCheckoutSession {
  id              String   @id @default(cuid())
  shipmentId      String   @unique
  shoppingCartId  String
  notifyToken     String   @unique
  entryUrl        String
  status          String   // pending_payment | completed | failed | expired
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}
```

`Shipment.labelProvider = dhl_parcel` nach erfolgreichem Checkout.

Optional später: `labelCheckoutPending` Boolean statt separater Session-Tabelle — Session-Tabelle ist für Idempotenz + Notify klarer.

---

## 7. Implementierungs-Slices (PR-Reihenfolge)

| PR | Inhalt | Credentials |
| --- | --- | --- |
| **4B.1** | ADR-Ergänzung, Domain, `DhlPrivateCheckoutSession`, Client + Mock-Tests | Sandbox API Key |
| **4B.2** | `notifyUrl`-Route + `completeDhlPrivateLabelPurchase` | notifyUrl-Ticket |
| **4B.3** | Adapter + erweiterter Port (`payment_required`) | Sandbox |
| **4B.4** | Admin Integrationen (Presets, Verbindung testen) | Ja |
| **4B.5** | Bestell-UI: Kanalwahl + Redirect-Flow + Status nach Callback | Sandbox E2E |
| **4B.6** | Provider-Fehler-UX, Ops-Runbook | Prod-Freigabe |

**Parallel sinnvoll:** Epic-7-Slice-5 private Label-Blob (PDF dauerhaft speichern) — gilt für IM **und** DHL.

---

## 8. Ops-Checkliste (ohne EKP)

1. [ ] App im [DHL Developer Portal](https://developer.dhl.com/) — ggf. **zweite App** oder Private-Shipping-Scope freischalten lassen.
2. [ ] API Key in Env; Sandbox testen.
3. [ ] **Private Shipping Onboarding** mit DHL (Partner-Produktkatalog wird zugewiesen).
4. [ ] `notifyUrl` per Service-Ticket registrieren (`NEXT_PUBLIC_SITE_URL` muss stabil HTTPS sein).
5. [ ] Absenderadresse = Shop-Settings (wie `buildInternetmarkeSenderFromShopSettings`).
6. [ ] Zeichensatz: API nur **ISO-8859-1** — Umlaute/Adressen normalisieren oder ablehnen mit klarer Meldung.
7. [ ] Produktion: Sandbox-Freigabe → Prod-Freigabe durch DHL.

**Kein EKP nötig.** Vertrag läuft über Private-Shipping-AGB (Online Franking).

---

## 9. Risiken & Nicht-Ziele (4B v1)

| Risiko | Mitigation |
| --- | --- |
| Admin schließt DHL-Tab ohne zu zahlen | Session `pending`; Button „Bezahlen fortsetzen“ mit gleicher `entryUrl` oder Cart neu |
| Notify kommt nicht an (Firewall, Deploy) | Manueller „Zahlung prüfen“-Button ruft Cart-Status ab |
| Void/Storno nach Kauf | Private Shipping: eigene Storno-Regeln klären — evtl. v1 **kein Void**, nur manuelle Retoure |
| Unterschiedliche API Keys IM vs Private | Dokumentieren; ggf. ein Key wenn Portal kombiniert |
| Vercel Cron für abgelaufene pending Sessions | Optional Cleanup nach 24 h |

**Nicht in 4B v1:** Automatische Gewichtsberechnung, Multi-Package, Kunden-Self-Service-Label, DHL Geschäftskunden-API (4A).

---

## 10. Empfehlung für jerry's (konkret)

### Sofort (ohne Entwicklung)

1. In **Integrationen → Internetmarke** Presets prüfen: mindestens ein **Warenpost**-Produkt (S/M passend zu typischen Artikeln) + ein Brief-Produkt.
2. Schwere/ sperrige Artikel: Label auf dhl.de frankieren, im Admin **DHL + Sendungsnummer** (manuell).

### Nächster Entwicklungsschritt

**Slice 4B.1–4B.3** in Sandbox — Notify-URL auf Preview-Deployment testen.

### Später (wenn Volumen steigt)

DHL-Geschäftskundenvertrag → **Slice 4A** (Versenden V2): ein Klick wie Internetmarke, bessere Stückkosten, Retoure-Labels.

---

## 11. Referenzen im Repo

| Thema | Pfad |
| --- | --- |
| Label-Port | `features/fulfillment/application/shipping-label-port.ts` |
| Internetmarke-Adapter | `features/fulfillment/infrastructure/internetmarke-shipping-label-adapter.ts` |
| IM Presets | `features/fulfillment/domain/internetmarke-product-presets.ts` |
| Products API | `features/fulfillment/infrastructure/internetmarke-products-api.ts` |
| Bestell-Panel | `app/admin/(dashboard)/orders/order-internetmarke-panel.tsx` |
| ADR | `docs/adr/0009-fulfillment-shipments.md` |

---

## Copy-Paste — nächster Agent (Slice 4B.1)

```
Epic 7 Slice 4B: DHL Private Shipping (ohne EKP) — Machbarkeitskonzept liegt in
docs/EPIC7_SLICE4B_DHL_PRIVATE_SHIPPING.md.

Starte mit 4B.1: DhlPrivateCheckoutSession Schema, HTTP-Client (Sandbox),
Mock-Tests für Cart anlegen + entryUrl. Port noch nicht an UI anbinden.
Branch: cursor/epic7-slice4b-dhl-private-client-a917
Antworten auf Deutsch.
```
