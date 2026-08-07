# Cursor Cloud Agent — Dev & Next.js-Client

## Symptom

- Das **Next.js „N“** (Dev-Indikator) fehlt unten rechts.
- **Keine Client-Aktionen**: Bestellungen per Zeilenklick, Status-Dropdowns, Warenkorb-Flyout, Server Actions.

Das **N** ist kein Deko-Element — es zeigt, dass der **Next.js-Dev-Client** (Hydration, Router, HMR) geladen ist. Fehlt es, ist meist der Client blockiert, nicht „nur“ die Anzeige.

## Häufige Ursachen

| Ursache | Was tun |
|--------|---------|
| **Eingebettete Cursor-Vorschau** (sandboxed iframe, `Origin: null`) | Next.js blockiert `/_next/*` **ohne** Config-Fix → Admin in **externem Tab** öffnen |
| **Falsche URL** (https, trycloudflare, anderer Port) | `npm run dev:cloud`, dann **`http://localhost:3001`** (Port-Forward → Globus) |
| **`next start` statt `next dev`** | Kein Dev-„N“; für lokales Testen immer `npm run dev` / `dev:cloud` |
| **Zweiter Dev-Server / Lock** | `npm run dev:stop`, dann einmal `npm run dev:cloud` |
| **Cross-Origin** (Terminal: `Blocked cross-origin request to Next.js dev resource`) | Host in `allowedDevOrigins` (`lib/site/allowed-dev-origins.ts`), Server **neu starten** |

## Empfohlener Workflow (Cloud Agent)

```bash
npm run dev:stop
unset AUTH_URL NEXT_PUBLIC_SITE_URL   # optional; dev:cloud setzt localhost
npm run dev:cloud
```

1. **Ports → 3001 → Globus**
2. Browser: **`http://localhost:3001`** (http, nicht https)
3. Admin: **`http://localhost:3001/admin`** — wenn das **N** fehlt, Link in **neuem Tab** außerhalb der eingebetteten Vorschau öffnen

Nach ~5 s ohne Dev-Client zeigt das Admin-Dashboard einen **gelben Hinweis** mit derselben Anleitung.

## Technik (Kurz)

- `devIndicators.position: bottom-right` (Sidebar verdeckt sonst unten links)
- `allowedDevOrigins` für Cursor, Codespaces, Cloudflare-Tunnel
- Middleware läuft **nicht** auf `/_next` und `/__nextjs`
- Production: `X-Frame-Options: DENY`; Development: kein DENY (iframe-tauglicher)
