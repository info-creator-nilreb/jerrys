# Epic 12 — Agent-Handoff: CMS light

**Zielgruppe:** Cloud-/Cursor-Agent  
**Basis-Branch:** `main` (nach Epic 4 #64/#65; Epic 11 Slice 1 idealerweise parallel oder vorher für Assets)  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-12-content-pages-and-cms-light)  
**Fachdokument:** [EPIC12_CONTENT_PAGES_CMS.md](./EPIC12_CONTENT_PAGES_CMS.md)  
**Abhängigkeiten:** Epic 5 Workshop-Kalender-Komponente; Epic 10 Kategorien; bestehendes `/admin/startseite`

---

## Abgrenzung

| Thema | Hinweis |
| --- | --- |
| Generischer Page-Builder | **Nein** — nur kuratierte Blöcke |
| Versionierung / Kollaboration | **Nein** in v1 |
| `/admin/startseite` | Marketing-Reviews/Social heute hardwired — in Slice 6 in CMS-Blöcke migrieren |
| Rechtstexte (`/impressum`, `/datenschutz`, …) | eigene Seitentypen + strengere Sanitization |
| Workshop-Kalender | wiederverwenden (`WorkshopSessionList` / Storefront-APIs) — **keine** zweite Buchungslogik |
| Reservierte Pfade | `/admin`, `/api`, `/checkout`, `/produkte`, `/kategorien`, `/kollektionen`, `/warenkorb`, `/konto`, `/termine`, … |

---

## Ist-Zustand

- Startseite: App-Router + Marketing-Inhalte (DB `homepage_*` / Admin Startseite)
- Statische/Content-Seiten: bestehende Routes unter Storefront (Impressum, Datenschutz, …)
- Workshop-Einbettung PDP: Flag `showWorkshopCalendar`
- Kein `ContentPage` / Block-Modell bisher
- Sanitization: `isomorphic-dompurify` bereits Dependency

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic12-slice<N>-<kurzname>-ce5b`

| Slice | Inhalt | Exit |
| --- | --- | --- |
| **1** | ADR-0007 + `ContentPage` / `ContentBlock` Schema, Seitentyp, Slug, SEO, `draft`/`published` | ✅ Migration; Lesen/Zod ohne öffentliches Routing |
| **2** | Block-Registry + Server-Component-Renderer + Zod pro Block; sichere Fallbacks | ✅ Unit-Tests Registry/Validierung |
| **3** | Admin-Editor: Blöcke add/edit/reorder/remove, explizites Speichern | Lucide-Icons, Markengrün, mobile bedienbar |
| **4** | Draft/Publish + signierte Preview-URL (kurzlebig); Drafts nicht in Sitemap/Nav | Preview ohne Auth-Leak |
| **5** | Freie Seiten-Routing, Slug-Schutz, Redirect-Konzept bei URL-Wechsel | Keine Kollision mit Systempfaden |
| **6** | Migration Startseite + Rechtstexte + Marketing ohne URL-Bruch | Smoke aller bisherigen öffentlichen URLs |
| **7** | Block „Gruppentermin-Kalender“ + optional PDP (Epic 5 wiederverwenden) | Eine Buchungslogik |

**Empfehlung:** Slice 1–2 können vor Epic-11-Uploads laufen (Textblöcke). Bild-Hero braucht Object Storage (Epic 11 Slice 2) oder vorerst nur externe/URL-Felder mit Allowlist.

---

## Block-Set v1 (verbindlich)

Hero, RichText, Bild/Text, Produkt-/Kategorieauswahl, kuratierte Produktliste, USP-Leiste, FAQ, Social/Review (aus Startseite), Workshop-Kalender.

---

## Qualitätsregeln

- Drafts: weder öffentlich noch indexierbar
- RichText serverseitig sanitizen
- Kein `eval`, kein freies HTML/CSS/JS aus Admin
- WCAG 2.2 AA, mobile, eine Primäraktion pro Ansicht
- `npm run architecture:check` bei neuen `features/`-Modulen beachten (ggf. `content` Bounded Context)

---

## Copy-Paste — Aufgabe für neuen Agenten

```
Epic 12 (PLATFORM: Content Pages and CMS Light) auf main umsetzen.

Lies zuerst:
- docs/EPIC12_AGENT_HANDOFF.md (dieses Handoff)
- docs/EPIC12_CONTENT_PAGES_CMS.md
- docs/PLATFORM_ROADMAP.md (Epic 12)
- docs/EPIC11_AGENT_HANDOFF.md (Asset-/Branding-Abhängigkeit)
- bestehende Startseite: app/(storefront)/page.tsx, app/admin/(dashboard)/startseite/

Beginne mit Slice 1: ADR + ContentPage/ContentBlock-Datenmodell (draft/published,
Slug, SEO-Felder, Seitentyp). Noch kein öffentlicher Renderer und kein Editor.

Branch: cursor/epic12-slice1-content-model-ce5b
Parallel ok zu Epic 11 Slice 1; Bild-Uploads erst nach Object-Storage-ADR.
Tests: npm run validate (mindestens typecheck + test:unit)
Antworten auf Deutsch.
```

---

## Nach Epic 12

- Epic 13 AI-Assisted Content (optional, hinter Port)
- Epic 6 Zettle / Epic 7 Versand nur mit Provider-Credentials
