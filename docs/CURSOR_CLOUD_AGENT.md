# Cursor Cloud Agent — stabil testen

Lokal im Workspace funktioniert `npm run dev` und `http://localhost:3001` direkt. Im **Cloud Agent** läuft Next.js in einer **Remote-VM**; der Rechner erreicht den Shop über **Port-Forwarding** (Stecker → 3001 → Globus).

## Symptom (wenn etwas „tot“ wirkt)

- Das **Next.js „N“** (Dev-Indikator) fehlt unten rechts.
- **Keine Client-Aktionen**: Admin-Zeilenklicks, Status-Dropdowns, Warenkorb-Flyout, Server Actions.

Das **N** zeigt, dass der **Next.js-Dev-Client** (Hydration, Router, HMR) geladen ist — nicht nur HTML vom Server.

## Empfohlener Ablauf

```bash
npm run dev:stop
npm run dev:cloud
```

1. Im Agent: **Ports → 3001 → Globus**
2. Browser: **`http://localhost:3001`** (**http**, nicht https)
3. Admin: **`http://localhost:3001/admin/login`** — bei CSRF/Hydration-Problemen **externen Tab** (Safari/Chrome) nutzen, nicht nur die eingebettete Vorschau.

Repository-Umgebung: `.cursor/environment.json` startet optional `dev:cloud` und exponiert Port **3001**.

## Admin in der Cloud

- Seed (nach `db:seed`): `admin@example.com` / `change-me-now`
- Eigenes Dev-Passwort (zweites Terminal, Dev-Server weiterlaufen lassen):

```bash
ADMIN_SEED_EMAIL="deine@mail.de" ADMIN_SEED_PASSWORD="dein-dev-passwort" npm run admin:set-password
# Lockout: MFA deaktivieren
ADMIN_SEED_EMAIL="deine@mail.de" ADMIN_SEED_PASSWORD="dein-dev-passwort" npm run admin:set-password -- --disable-mfa
```

## Typische Fehler

| Symptom | Ursache | Fix |
|--------|---------|-----|
| „Another next dev server is already running“ | Zweiter `npm run dev` | `npm run dev:stop`, dann `npm run dev:cloud` |
| `localhost:3001` lädt nicht | Kein Forward / falscher Tab | Ports-Panel, Globus bei 3001 |
| Login / CSRF | iframe-Vorschau, falsche `AUTH_URL` | Externer Browser; `dev:cloud` setzt localhost |
| Terminal `GET / 200`, Browser leer | iframe + blockiertes Client-JS | Externer Tab; `allowedDevOrigins` prüfen |
| Warenkorb-Klick ohne Reaktion | Cookie-Overlay über Header | Nach Pull: Banner unter Header (z-index) |
| Cross-Origin auf `/_next/*` | Host nicht in `allowedDevOrigins` | `lib/site/allowed-dev-origins.ts`, Server neu starten |

## Nicht mischen

- **Port-Forward:** `npm run dev:cloud` → Browser **`http://localhost:3001`**
- **Tunnel (Notfall):** `AUTH_URL=https://….trycloudflare.com npm run dev` → nur diese HTTPS-URL im Browser

## Technik (Kurz)

- `devIndicators.position: bottom-right` (`next.config.ts`)
- `allowedDevOrigins` via `lib/site/allowed-dev-origins.ts` (Cursor, Codespaces, Cloudflare)
- Middleware **nicht** auf `/_next` und `/__nextjs`
- Production: `X-Frame-Options: DENY`; Development: kein DENY

Nach ~5 s ohne Dev-Client zeigt das Admin-Dashboard einen **gelben Hinweis** (`AdminDevClientNotice`).

## Qualität

```bash
npm run validate
```
