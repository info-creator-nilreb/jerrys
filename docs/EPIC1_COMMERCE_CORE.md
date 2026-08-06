# Epic 1 — Commerce Core (Umsetzungsstand)

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-1-commerce-core)

## Geliefert (erste Inkremente)

| Thema | Umsetzung |
| --- | --- |
| Getrennte Fulfillment-Achse | `orders.fulfillment_status` + State-Machine in `features/orders` |
| Zahlungs-Achse | Domain-Guards für `OrderPaymentStatus` in `features/orders` (PSP-Zeilen weiter in `order_payments`) |
| Atomare Bestandsreservierung | `features/inventory`: Reservierung bei `pending_payment`, Commit bei Zahlung, Release bei Storno |
| Bestands-Audit | `stock_movements` bei Hold, Commit, Release und Versand |
| Ereignishistorie + Outbox | `order_events` + `integration_outbox_messages` (transaktional via `createOrderEvent`) |
| Webhook-/Capture-Dedupe | `webhook_inbox_entries` für PayPal-Capture (`completePayPalCaptureFlow`) |

## Bewusst noch offen (Folge-Stories)

- Outbox-Publisher / Queue-Worker (nur Persistenz, kein Versand)
- Reservierungs-Ablauf (TTL / Cron) für hängende `pending_payment`
- Admin-UI: explizite Anzeige `fulfillment_status` statt nur abgeleiteter Triple-Achse
- Vollständige Entkopplung des aggregierten `orders.status` von Zahlung/Versand
