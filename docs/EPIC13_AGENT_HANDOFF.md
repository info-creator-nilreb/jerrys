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

## Ist-Zustand (nach Slice 5 Start)

- Slices 1–3: Port, Admin-Config, Textassistent
- Bildassistent auf Produkt-Edit: Prompt → Moderation → Vorschau → explizite Übernahme in Vercel Blob + `ProductImage`
- Alt-Text-Entwurf für bestehende Galeriebilder (noch ohne Alt-Editor-Persistenz)
- Slice 5 (Start): CMS-Textentwürfe für **Hero** und **RichText** im Inhalte-Editor (`generateCmsAiTextDraft` + UI-Hook, kein Auto-Publish)
- Noch offen: weitere CMS-Blöcke/Bildentwürfe, Usage-Dashboard (Slice 6)

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
| **6** | Betrieb: Usage-/Kostenmetriken, Quoten, verständliche Providerfehler, Audit | Exit-Kriterien Epic 13 |

**Empfehlung:** Als Nächstes Slice 2 (Konfiguration/Limits) oder Slice 3 (Text-UI), sobald ein OpenAI-Key in Preview verfügbar ist.

---

## Qualitätsregeln

- Icons: `lucide-react`; Markengrün aus `app/globals.css`
- WCAG 2.2 AA; eine Primäraktion pro Ansicht
- Backend zeigt autoritativen Serverzustand nach Übernahme
- `npm run architecture:check` — keine Imports von `features/integrations/infrastructure` außerhalb des Moduls
- Antworten/Commits: Deutsch / Conventional Commits
- Next.js: Guides unter `node_modules/next/dist/docs/` bei API-Fragen

---

## Copy-Paste — Aufgabe für neuen Agenten (Slice 5)

```
Epic 13 Slice 5 (CMS KI-Entwürfe) nach Slice 4 umsetzen.

Lies zuerst:
- docs/EPIC13_AGENT_HANDOFF.md
- docs/EPIC13_AI_CONTENT_ASSISTANCE.md
- docs/EPIC12_CONTENT_PAGES_CMS.md / Admin-Inhalte-Editor

Branch: cursor/epic13-slice5-cms-ai-drafts-e864
Text-/Bildentwürfe für ausgewählte Blöcke; kein Auto-Publish.
Antworten auf Deutsch. Tests: npm run validate (mindestens architecture + typecheck + test:unit)
```

---

## Nach Epic 13

- Epic 14 Semantic Search / Discoverability ([EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md](./EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md))
