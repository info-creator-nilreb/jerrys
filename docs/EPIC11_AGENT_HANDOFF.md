# Epic 11 — Agent-Handoff: Shop-Einstellungen & Branding

**Zielgruppe:** Cloud-/Cursor-Agent  
**Basis-Branch:** `main` (nach Merge Epic 4 Refunds #64 + Reconciliation #65)  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-11-central-shop-settings-and-branding)  
**Fachdokument:** [EPIC11_BRANDING_SETTINGS.md](./EPIC11_BRANDING_SETTINGS.md)  
**Design:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), Markengrün in `app/globals.css` (`--primary` / `--primary-hover`)

---

## Abgrenzung

| Thema | Status / Hinweis |
| --- | --- |
| Hardcodiertes jerry’s-Branding | heute in CSS, Layout, E-Mail-Templates, Rechnungs-PDF |
| `/admin/startseite` | **nur** Homepage-Marketing (Reviews/Social) — **nicht** globales Branding |
| `ShopShippingSettings` / `ShopWorkshopSettings` | existierende Singletons als Muster; **kein** Ersatz für Shop-Branding |
| Object Storage | laut ADR-0002 nötig vor Upload-Slice; **kein** ephemeres Vercel-FS |
| Multi-Theme / White-Label | explizit out of scope |

---

## Ist-Zustand (relevante Anker)

- Tokens: `app/globals.css` (`--primary: #8bbe25`, Surfaces, Semantic)
- Storefront-Header/Footer: feste Marke „jerry's“, keine DB-Einstellungen
- E-Mails: `lib/email/transactional-email-layout.ts` (feste Farben/Texte)
- Rechnungen: PDF-Pipeline unter `lib/invoice/`
- Admin-Sidebar: noch **kein** Link `/admin/einstellungen`
- ADRs: nächste freie Nummer **0006** ([docs/adr/README.md](./adr/README.md))

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic11-slice<N>-<kurzname>-ce5b`

| Slice | Inhalt | Exit |
| --- | --- | --- |
| **1** | ADR-0006 + Prisma `ShopSettings` (Singleton), Zod-Validierung Farben/URLs/Kontakt, Seed mit heutigen jerry’s-Defaults, Cache/Revalidate-Strategie | Migration deploybar; Lesen ohne Admin-UI |
| **2** | Dauerhafter Object Storage (ADR falls noch offen) + Upload Logo/Favicon/OG; Typ/Größe validieren | Dateien nicht auf Vercel-FS; Fallback ohne Asset |
| **3** | Admin `/admin/einstellungen`: Formular, Vorschau, Speichern, Fehler/Erfolg, Audit/Outbox | WCAG, eine Primäraktion, Markengrün |
| **4** | Storefront: CSS-Variablen serverseitig aus Settings; Metadata/OG; Header/Footer dynamisch | Kein Deploy für Farb-/Namensänderung |
| **5** | E-Mail-Layout, Rechnungs-PDF, Admin-Login auf Settings | Fehlende Assets brechen Checkout/Mail/PDF nicht |
| **6** | Feinschliff Migration/Fallbacks, Docs (`OPERATIONS.md`, `SECURITY_SURFACE.md`) | Exit-Kriterien Epic 11 |

**Abhängigkeit:** Slice 2 vor produktiven Uploads in Slice 3–5. Slice 1 kann ohne Storage starten (nur Text/Farben).

---

## Qualitätsregeln (nicht verhandelbar)

- Keine freie CSS-/JS-Eingabe durch Admins
- WCAG 2.2 AA für Primär-/Kontrastfarben (warnen oder blockieren)
- Backend zeigt autoritativen Serverzustand nach Save
- Icons: `lucide-react`
- Antworten/Commits: Deutsch / Conventional Commits
- Next.js: Guides unter `node_modules/next/dist/docs/` bei API-Fragen

---

## Copy-Paste — Aufgabe für neuen Agenten

```
Epic 11 (PLATFORM: Central Shop Settings and Branding) auf main umsetzen.

Lies zuerst:
- docs/EPIC11_AGENT_HANDOFF.md (dieses Handoff)
- docs/EPIC11_BRANDING_SETTINGS.md
- docs/PLATFORM_ROADMAP.md (Epic 11)
- docs/DESIGN_SYSTEM.md, app/globals.css, docs/adr/0002-vercel-runtime.md

Beginne mit Slice 1: ADR-0006 + ShopSettings-Singleton + Seed der heutigen
jerry’s-Werte (Name, Primärgrün #8bbe25 / Hover #74a320, Kontaktdaten-Platzhalter).
Kein Object-Storage und kein volles Admin-UI in Slice 1.

Branch: cursor/epic11-slice1-shop-settings-ce5b
Tests: npm run validate (mindestens typecheck + test:unit)
Antworten auf Deutsch.
```

---

## Nach Epic 11

- **Epic 12 CMS light:** [EPIC12_AGENT_HANDOFF.md](./EPIC12_AGENT_HANDOFF.md) (braucht stabile Branding-/Asset-Pipeline sinnvoll, kann Slice 1 parallel starten)
- Stripe bleibt bewusst später (Epic 4 Rest)
