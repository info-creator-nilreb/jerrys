# Epic 13 — Agent-Handoff: KI-gestützte Content- und Bildwerkzeuge

**Zielgruppe:** Cloud-/Cursor-Agent  
**Basis-Branch:** `main`  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-13-ai-assisted-content-and-images)  
**Fachdokument:** [EPIC13_AI_CONTENT_ASSISTANCE.md](./EPIC13_AI_CONTENT_ASSISTANCE.md)  
**ADR:** [0010-ai-content-assistance-port.md](./adr/0010-ai-content-assistance-port.md)

---

## Abgrenzung

| Thema | Hinweis |
| --- | --- |
| Auto-Publish / autonome Veröffentlichung | **Nein** — Human-in-the-loop |
| Kunden-/Bestelldaten in Prompts | **Nein** — Allowlist + Reject |
| KI-Kundenservice / Chat | **Nein** (Nicht-Ziel) |
| Semantische Suche / Embeddings | Epic 14 — eigener Port |
| Provider-SDK in Catalog/CMS | **Nein** — nur `@/features/integrations` |

---

## Ist-Zustand (nach Slice 6)

- Slices 1–3: Port, Admin-Config, Textassistent
- Bildassistent auf Produkt-Edit: Prompt → Moderation → Vorschau → explizite Übernahme in Vercel Blob + `ProductImage`
- Alt-Text-Entwurf für Galeriebilder **mit Persistenz** auf `ProductImage.alt`
- Slice 5: CMS-Textentwürfe für **Hero** und **RichText** (kein Auto-Publish); Bild/weitere Blöcke offen
- Slice 6: Usage-/Kostenübersicht im AI-Settings-Panel, verständliche Provider-/Quota-Fehler, Audit-Events (`AiContentGenerationEvent`)

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic13-slice<N>-<kurzname>-e864`

| Slice | Inhalt | Exit |
| --- | --- | --- |
| **1** | ADR-0010 + Port + NotConfigured + OpenAI-Adapter + Fact-Allowlist + Unit-Tests | ✅ |
| **2** | Admin-Konfiguration: Limits, Modellprofile, optional verschlüsselter Key (wie Instagram/INTERNETMARKE) | ✅ |
| **3** | Textassistent im Produktformular: Vorschau/Diff, explizites Übernehmen einzelner Felder | ✅ |
| **4** | Bildassistent: Prompt/Quelle, Moderation, temporäre Vorschau, explizite Übernahme in Object Storage | ✅ |
| **5** | CMS-Integration für ausgewählte Blöcke (Text/Bild-Entwürfe) | ✅ Start (Hero/RichText-Text); Bild/weitere Blöcke offen |
| **6** | Betrieb: Usage-/Kostenmetriken, Quoten, verständliche Providerfehler, Audit | ✅ |

**Empfehlung:** Restarbeiten Epic 13 nur noch optionale CMS-Bildentwürfe; Exit-Kriterien Betrieb erfüllt. Als Nächstes Epic 14 oder Go-Live-Gates.

---

## Qualitätsregeln

- Icons: `lucide-react`; Markengrün aus `app/globals.css`
- WCAG 2.2 AA; eine Primäraktion pro Ansicht
- Backend zeigt autoritativen Serverzustand nach Übernahme
- `npm run architecture:check` — keine Imports von `features/integrations/infrastructure` außerhalb des Moduls
- Antworten/Commits: Deutsch / Conventional Commits
- Next.js: Guides unter `node_modules/next/dist/docs/` bei API-Fragen

---

## Copy-Paste — Aufgabe für neuen Agenten (Slice 6 erledigt)

Slice 6 ist umgesetzt auf `cursor/final-go-live-package-3106`. Weitere Epic-13-Arbeit: ggf. CMS-Bildentwürfe (Slice 5 Rest) oder Epic 14.

---

## Nach Epic 13

- Epic 14 Semantic Search / Discoverability ([EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md](./EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md))
