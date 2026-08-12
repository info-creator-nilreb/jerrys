# Finales Livegang-Paket

Verbindlicher Scope für den Production-Cutover (Stand Abstimmung Product Owner).

## Im Scope

| # | Thema | Status | Hinweise |
| --- | --- | --- | --- |
| 1 | Epic 13 KI-Content abschließen | ✅ (1–6) | Slice 6: Usage/Kosten, Providerfehler, Audit; Alt-Text-Persistenz; CMS-Bildentwürfe optional offen |
| 2 | Zettle bidirektional | extern | PR #102 — nicht parallel nachbauen |
| 3 | Retoure / Reship Admin-MVP | ✅ | Sync bei Retoure, Reship-Entwurf, ConfirmDialog, Audit; private Labels später |
| 4 | Admin Index: Card-Layout mobil | ✅ | Cards unter `md`, Tabelle ab `md` auf allen Indexseiten |
| 5 | Epic 14 Semantische Suche | offen (Slice 1–2 ✅) | SEO/Schema + Suchdokument/Embedding-Index; Slices 3–5 (Hybrid, Feed, Eval) offen |
| 6 | Confirm-Dialoge statt `window.confirm` | ✅ | `ConfirmDialog` verdrahtet |
| 7 | PayPal Express + Apple Pay | ✅ | Warenkorb Smart Buttons + Apple Pay; PDP → Warenkorb-Express |
| 8 | Mobile-UX-Pass | in Arbeit | Storefront + Admin Feinschliff nach Card-/Express-Änderungen |
| 9 | Epic-/Slice-Hinweise aus UI | ✅ | Sichtbare Copy bereinigt |

## Explizit außerhalb (bis nach Live)

- Stripe als zweiter PSP
- DHL Parcel Adapter
- Kunden-Retourenportal
- Unlimited Taxonomy / Marketplace

## Operator-Gates (Epic 9)

Unverändert abzuarbeiten: [EPIC9_HARDENING_GO_LIVE.md](./EPIC9_HARDENING_GO_LIVE.md) (Staging, Secrets, PayPal Live+Webhook, Alerts, Restore).

## Branch

`cursor/final-go-live-package-3106` — PR #103.
