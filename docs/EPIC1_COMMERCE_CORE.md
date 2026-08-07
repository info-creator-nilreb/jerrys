# Epic 1 — Commerce Core (Umsetzungsstand)

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-1-commerce-core)

## Status: abgeschlossen (Lieferumfang Epic 1)

**Branch:** `cursor/epic-1-commerce-core-a364` / `cursor/epic-1-complete-97de`  
**Exit-Kriterium (Roadmap):** Doppelte/konkurrente Ereignisse wirken auf Geld, Bestand und Status höchstens einmal; ungültige Übergänge werden abgewiesen und protokolliert — umgesetzt über Reservierungen, Webhook-Inbox, Status-Maschinen, `order_events` und `stock_movements`.

Vor Merge auf `main`: Migration `20260806200000_epic1_commerce_core` ausführen (`npm run db:migrate`), Commerce-Tests laut Abschnitt „Testen“.  
**Merge-Checkliste:** [MERGE_EPIC1.md](./MERGE_EPIC1.md)

## Geliefert (erste Inkremente)

| Thema | Umsetzung |
| --- | --- |
| Getrennte Fulfillment-Achse | `orders.fulfillment_status` + State-Machine in `features/orders` |
| Zahlungs-Achse | Domain-Guards für `OrderPaymentStatus` in `features/orders` (PSP-Zeilen weiter in `order_payments`) |
| Atomare Bestandsreservierung | `features/inventory`: Reservierung bei `pending_payment`, Commit bei Zahlung, Release bei Storno |
| Bestands-Audit | `stock_movements` bei Hold, Commit, Release und Versand |
| Ereignishistorie + Outbox | `order_events` + `integration_outbox_messages` (transaktional via `createOrderEvent`) |
| Webhook-/Capture-Dedupe | `webhook_inbox_entries` für PayPal-Capture (`completePayPalCaptureFlow`) |

## Ergänzt (zweites Inkrement)

- Reservierungs-TTL (2 h) + `expireStaleStockReservations` + Route `POST /api/internal/commerce-maintenance`
- Outbox-Batch-Publisher (`publishIntegrationOutboxBatch`) über dieselbe Route
- Admin-Bestelldetail: `fulfillment_status` + Liste `stock_reservations`

## Bewusst noch offen (Folge-Stories / Epic 1.1+)

Diese Punkte sind **kein** Blocker für den Epic‑1‑Abschluss (MVP bewusst schlank):

- Outbox-Publisher an echte Queue koppeln (MVP markiert Nachrichten als `published` via `publishIntegrationOutboxBatch`)
- Vollständige Entkopplung des aggregierten `orders.status` von Zahlung/Versand (Admin-Triple bleibt vorerst auf `orders.status` gemappt)

**Hinweis:** PR #3 (`availableQuantity` + Event) ist durch Epic‑1‑`stock_reservations` ersetzt — nicht parallel mergen.

## Testen (Epic 1)

### Automatisiert (lokal oder Cloud Agent)

```bash
npm run validate
```

Relevante Unit-Tests: `fulfillment-status-machine`, `payment-status-machine`, `webhook-inbox`, `order-events`, `reservation-ttl`.

Optional nur Commerce-Tests:

```bash
npm run test:unit -- tests/unit/fulfillment-status-machine.test.ts tests/unit/payment-status-machine.test.ts tests/unit/webhook-inbox.test.ts tests/unit/order-events.test.ts tests/unit/reservation-ttl.test.ts
npm run test:integration -- tests/integration/commerce-maintenance-route.test.ts
```

### Dev-Server

```bash
npm run dev
```

Standard: **http://127.0.0.1:3001** (Cloud-Umgebung: Port 3001, `DATABASE_URL` und PayPal/Auth aus Dashboard-Secrets).

### Manueller Checkout (Reservierung + Zahlung)

Voraussetzungen: aktives Produkt mit `available_quantity` ≥ 1, PayPal Sandbox konfiguriert (`PAYPAL_*`).

1. Storefront: Produkt in den Warenkorb, Checkout ausfüllen, PayPal starten.
2. In der DB (oder Admin-Bestelldetail): Bestellung `pending_payment`, Abschnitt **Bestandsreservierungen** (`active`, Ablaufzeit ~2 h).
3. **`available_quantity`** am Produkt ist um die Bestellmenge reduziert.
4. PayPal-Zahlung abschließen → Status `paid`, Reservierung `committed`, Outbox-Einträge `pending` (bis Maintenance läuft).
5. Capture erneut auslösen (Replay) → kein doppelter Bestandsabbuch; Inbox-Dedupe.

### Admin

1. `/admin/login` → Bestellung öffnen.
2. **Fulfillment**-Label neben technischem Status; Reservierungen sichtbar bei offenen PayPal-Bestellungen.
3. Status „In Bearbeitung“ → „Versandt“: `fulfillment_status` → `shipped`, `stock_movements` mit `warehouse_ship`.

### Maintenance (Ablauf + Outbox)

Secret in `.env` oder Cloud-Secrets:

```bash
COMMERCE_MAINTENANCE_SECRET="…"   # z. B. openssl rand -hex 32
```

Aufruf:

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/internal/commerce-maintenance" \
  -H "Authorization: Bearer $COMMERCE_MAINTENANCE_SECRET"
```

Antwort u. a. `expiredReservations`, `outbox.published`. Für abgelaufene Reservierungen: Bestand zurück, `pending_payment` → `cancelled`.

### SQL-Snippets (Supabase/psql)

```sql
SELECT id, status, fulfillment_status FROM orders ORDER BY created_at DESC LIMIT 5;
SELECT * FROM stock_reservations WHERE order_id = '…';
SELECT status, event_type, created_at FROM integration_outbox_messages ORDER BY created_at DESC LIMIT 10;
SELECT * FROM webhook_inbox_entries ORDER BY received_at DESC LIMIT 5;
SELECT reason, quantity_delta, created_at FROM stock_movements ORDER BY created_at DESC LIMIT 20;
```
