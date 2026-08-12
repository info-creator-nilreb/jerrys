# Finales Livegang-Paket

Verbindlicher Scope für den Production-Cutover (Stand Abstimmung Product Owner).

## Im Scope

| # | Thema | Status | Hinweise |
| --- | --- | --- | --- |
| 1 | Epic 13 KI-Content abschließen | offen (Slices 1–4 ✅) | CMS-KI (5), Betrieb/Usage (6), Alt-Text-Persistenz |
| 2 | Zettle bidirektional | extern | PR #102 — nicht parallel nachbauen |
| 3 | Retoure / Reship Admin-MVP | umgesetzt | Epic 7 Slice 5; `forceNew`, ConfirmDialog, Audit; private Labels später |

| 4 | Admin Index: Card-Layout mobil | ✅ | Cards unter `md`, Tabelle ab `md`: Produkte, Bestellungen, Kunden, Kategorien, Kollektionen, Inhalte, Promotions, Termine, Bestand, E-Mails |
| 5 | Epic 14 Semantische Suche | offen (Slice 1 ✅) | SEO/Schema-Audit; Slices 2–5 laut `EPIC14_…` |
| 6 | Confirm-Dialoge statt `window.confirm` | ✅ | `ConfirmDialog` verdrahtet |
| 7 | PayPal Express + Apple Pay | offen | PDP/Warenkorb echte Buttons, nicht Platzhalter |
| 8 | Mobile-UX-Pass | offen | Storefront + Admin als UX-Review |
| 9 | Epic-/Slice-Hinweise aus UI | ✅ | Sichtbare Copy bereinigt |

## Explizit außerhalb (bis nach Live)

- Stripe als zweiter PSP
- DHL Parcel Adapter
- Kunden-Retourenportal
- Unlimited Taxonomy / Marketplace

## Operator-Gates (Epic 9)

Unverändert abzuarbeiten: [EPIC9_HARDENING_GO_LIVE.md](./EPIC9_HARDENING_GO_LIVE.md) (Staging, Secrets, PayPal Live+Webhook, Alerts, Restore).

## Branch

`cursor/final-go-live-package-3106` — inkrementelle PRs/Commits pro Slice möglich; dieses Dokument hält den Gesamtumfang fest.
