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

## Ist-Zustand (nach Slice 3)

- ADR-0010; Port + OpenAI-Adapter; Admin-Konfiguration (Slice 1–2)
- Produkt-Textassistent auf `/admin/products/[id]/edit`: Entwurf → Vorschau → explizite Feldübernahme
- Kein Auto-Save; SEO-Titel/-Description nur Vorschau (kein Produktfeld)
- Noch **kein** Bildassistent und keine CMS-Übernahme

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic13-slice<N>-<kurzname>-e864`

| Slice | Inhalt | Exit |
| --- | --- | --- |
| **1** | ADR-0010 + Port + NotConfigured + OpenAI-Adapter + Fact-Allowlist + Unit-Tests | ✅ |
| **2** | Admin-Konfiguration: Limits, Modellprofile, optional verschlüsselter Key (wie Instagram/INTERNETMARKE) | ✅ |
| **3** | Textassistent im Produktformular: Vorschau/Diff, explizites Übernehmen einzelner Felder | ✅ |
| **4** | Bildassistent: Prompt/Quelle, Moderation, temporäre Vorschau, explizite Übernahme in Object Storage | Draft bis Confirm |
| **5** | CMS-Integration für ausgewählte Blöcke (Text/Bild-Entwürfe) | kein Auto-Publish |
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

## Copy-Paste — Aufgabe für neuen Agenten (Slice 4)

```
Epic 13 Slice 4 (Bildassistent) nach Slice 3 umsetzen.

Lies zuerst:
- docs/EPIC13_AGENT_HANDOFF.md
- docs/EPIC13_AI_CONTENT_ASSISTANCE.md
- docs/adr/0010-ai-content-assistance-port.md
- docs/adr/0008-object-storage.md
- ProductMediaSection / ObjectStorage Port

Branch: cursor/epic13-slice4-image-assistant-e864
Moderation vor Dauerhaft-Speichern; explizite Übernahme; kein Auto-Publish.
Antworten auf Deutsch. Tests: npm run validate (mindestens architecture + typecheck + test:unit)
```

---

## Nach Epic 13

- Epic 14 Semantic Search / Discoverability ([EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md](./EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md))
