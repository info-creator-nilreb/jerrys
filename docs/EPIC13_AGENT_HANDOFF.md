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

## Ist-Zustand (nach Slice 1)

- ADR-0010 akzeptiert
- `AiContentPort` in `features/integrations` (Text, Vision/Alt, Image, Moderation)
- `NotConfigured`-Adapter ohne `OPENAI_API_KEY`
- OpenAI-Adapter (HTTP) hinter Env-Config
- Allowlist `assertSafeAiProductFacts` / `AI_ALLOWED_PRODUCT_FACT_KEYS`
- Noch **keine** Admin-UI und keine Produkt-/CMS-Übernahme

---

## Vorgeschlagene Slices (PRs)

Branch-Prefix: `cursor/epic13-slice<N>-<kurzname>-e864`

| Slice | Inhalt | Exit |
| --- | --- | --- |
| **1** | ADR-0010 + Port + NotConfigured + OpenAI-Adapter + Fact-Allowlist + Unit-Tests | ✅ |
| **2** | Admin-Konfiguration: Limits, Modellprofile, optional verschlüsselter Key (wie Instagram/INTERNETMARKE) | konfigurierbar ohne Client-Secrets |
| **3** | Textassistent im Produktformular: Vorschau/Diff, explizites Übernehmen einzelner Felder | kein Auto-Save |
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

## Copy-Paste — Aufgabe für neuen Agenten (Slice 2)

```
Epic 13 Slice 2 (KI Admin-Konfiguration) auf main bzw. nach Slice-1-Merge umsetzen.

Lies zuerst:
- docs/EPIC13_AGENT_HANDOFF.md
- docs/EPIC13_AI_CONTENT_ASSISTANCE.md
- docs/adr/0010-ai-content-assistance-port.md
- bestehende Integrations-UI unter /admin/einstellungen (Instagram/INTERNETMARKE/Zettle)

Branch: cursor/epic13-slice2-ai-admin-config-e864
Kein Auto-Publish. Secrets serverseitig / verschlüsselt. Antworten auf Deutsch.
Tests: npm run validate (mindestens architecture + typecheck + test:unit)
```

---

## Nach Epic 13

- Epic 14 Semantic Search / Discoverability ([EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md](./EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md))
