# Epic 11 — Agent-Handoff: Shop-Einstellungen & Branding

**Zielgruppe:** Cloud-/Cursor-Agent  
**Status:** Slices 1–6 umgesetzt (auf `main`)  
**Basis-Branch:** `main`  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-11-central-shop-settings-and-branding)  
**Fachdokument:** [EPIC11_BRANDING_SETTINGS.md](./EPIC11_BRANDING_SETTINGS.md)  
**Design:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), Markengrün in `app/globals.css` (`--primary` / `--primary-hover`)  
**Ops:** [OPERATIONS.md](./OPERATIONS.md#shop-settings-and-branding-epic-11) · Security: [SECURITY_SURFACE.md](./SECURITY_SURFACE.md)

---

## Abgrenzung

| Thema | Status / Hinweis |
| --- | --- |
| Hardcodiertes jerry’s-Branding | Defaults + Static `/branding/*`; Runtime aus `ShopSettings` |
| `/admin/startseite` | **nur** Homepage-Marketing (Reviews/Social) — **nicht** globales Branding |
| `ShopShippingSettings` / `ShopWorkshopSettings` | existierende Singletons; **kein** Ersatz für Shop-Branding |
| Object Storage | Vercel Blob für öffentliche Branding-Assets ([ADR-0008](./adr/0008-object-storage.md)) |
| Multi-Theme / White-Label | explizit out of scope |

---

## Umgesetzte Slices

Branch-Prefix historisch: `cursor/epic11-slice<N>-…-ce5b` / `…-a142`

| Slice | Inhalt | Status |
| --- | --- | --- |
| **1** | ADR-0006 + Prisma `ShopSettings`, Zod, Seed, Cache-Tag | ✅ |
| **2** | ADR-0008 + Vercel Blob Uploads + Fallbacks | ✅ |
| **3** | Admin `/admin/einstellungen` | ✅ |
| **4** | Storefront CSS-Vars, Metadata/OG, Header/Footer | ✅ |
| **5** | E-Mail, Rechnungs-PDF, Admin-Login | ✅ |
| **6** | Ops/Security-Docs, Fallbacks/Migration dokumentiert | ✅ |

---

## Qualitätsregeln (weiterhin gültig)

- Keine freie CSS-/JS-Eingabe durch Admins
- WCAG 2.2 AA für Primär-/Kontrastfarben (derzeit warnen)
- Backend zeigt autoritativen Serverzustand nach Save
- Icons: `lucide-react`
- Antworten/Commits: Deutsch / Conventional Commits
- Next.js: Guides unter `node_modules/next/dist/docs/` bei API-Fragen

---

## Nach Epic 11

- **Epic 12 CMS light:** [EPIC12_AGENT_HANDOFF.md](./EPIC12_AGENT_HANDOFF.md)
- Stripe bleibt bewusst später (Epic 4 Rest)
