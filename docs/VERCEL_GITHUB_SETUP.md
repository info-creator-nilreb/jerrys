# GitHub und Vercel anbinden

Diese Anleitung verbindet das Repository [`info-creator-nilreb/jerrys`](https://github.com/info-creator-nilreb/jerrys) mit **GitHub Actions** (bereits im Repo) und **Vercel** (einmalig im Dashboard oder per CLI).

## 1. Git (Remote ist bereits gesetzt)

Lokal:

```bash
git remote -v
# origin → https://github.com/info-creator-nilreb/jerrys.git
```

Empfohlener Cloud-Workflow:

1. Feature-Branch erstellen und committen.
2. Branch nach `origin` pushen.
3. Pull Request gegen `main` — **GitHub Actions** läuft automatisch (`.github/workflows/ci.yml`).
4. Nach Merge baut **Vercel** `main` für Preview/Production (sofern Projekt verknüpft).

Ohne lokale Builds: Code pushen und CI + Vercel-Preview abwarten (siehe [CLOUD_DEVELOPMENT.md](./CLOUD_DEVELOPMENT.md)).

## 2. Vercel-Projekt mit GitHub verknüpfen (empfohlen)

1. [Vercel → Add New → Project](https://vercel.com/new)
2. **Import Git Repository** → GitHub-App installieren, falls nötig.
3. Repository **`info-creator-nilreb/jerrys`** auswählen.
4. Framework: **Next.js** (Auto-Erkennung).
5. **Root Directory:** `./` (Standard).
6. **Build Command:** `npm run build` (Standard; `postinstall` führt `prisma generate` aus).
7. **Install Command:** `npm ci`.
8. **Node.js Version:** 22 (in Project Settings → General, falls abweichend).

### Umgebungsvariablen (Minimum für lauffähigen Deploy)

In Vercel → Project → **Settings → Environment Variables** für **Preview** und **Production** setzen (Werte nie ins Repo):

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | PostgreSQL **Transaction-Pooler** für Runtime (Supabase Port **6543**, ideal mit `?pgbouncer=true`). Session-Pooler `:5432` / Direct oft → `EMAXCONNSESSION` unter Serverless. |
| `DIRECT_DATABASE_URL` | Optional; **direkte** URL (`db.*.supabase.co:5432`) für Migrationen / Seed |
| `PG_POOL_MAX` | Optional; App-`pg.Pool`-Größe (Default auf Vercel: **1**) |
| `AUTH_SECRET` | Auth.js (min. 32 Zeichen, z. B. `openssl rand -base64 32`) — **für Preview und Production** getrennt setzen (Häkchen in Vercel). Alias: **`NEXTAUTH_SECRET`** (gleicher Wert ok). Nach Änderung **Redeploy**. Bleibt `MissingSecret` in den Logs: zuerst Preview **und** Production prüfen; Runtime-Log `auth_secret_missing_at_runtime` listet sichtbare `AUTH*`-Keys. **Hinweis:** Admin-Auth läuft in Node (`/api/auth`, Dashboard-Layout), nicht in der Edge-Middleware. |
| `AUTH_URL` | Kanonische App-URL (Production-Domain). **Preview:** weglassen oder nur für Preview setzen — sonst CSRF/Login-Fehler, wenn die Variable auf Production zeigt, du aber die `*.vercel.app`-URL öffnest (die App passt Preview automatisch an, siehe `lib/auth/vercel-auth-env.ts`). |
| `NEXT_PUBLIC_SITE_URL` | Öffentliche Shop-URL (E-Mails, Links) |
| `NEXT_PUBLIC_SUPABASE_URL` | Falls Supabase-Client genutzt wird |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon/Publishable Key |
| `RESEND_API_KEY` | Transaktions-E-Mail |
| `MAIL_FROM_EMAIL` | Absender-Adresse (Resend-verifizierte Domain), z. B. `info@deine-domain.de` |
| `MAIL_FROM_NAME` | Optional Anzeigename, z. B. `Jerrys` |
| `MAIL_FROM` | Alternativ eine Zeile `Jerrys <info@deine-domain.de>` — **nicht** nur `jerry's` ohne E-Mail |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (public Store) für Branding-/Medien-Uploads ([ADR-0008](./adr/0008-object-storage.md)); Preview und Production getrennt |

Optional je Feature: PayPal (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, für Webhooks `PAYPAL_WEBHOOK_ID`), Seed-Admin nur für Staging, siehe [`.env.example`](../.env.example). Webhook-URL in PayPal: `https://<host>/api/webhooks/paypal`.

**Preview:** eigene Preview-DB oder isolierte Branch-DB — keine Production-Kundendaten.

### Migrationen auf Vercel

Schema-Änderungen nicht blind in den Build legen, solange Preview und Production getrennte Datenbanken haben.

**Erster Import:** Der Build kann auch starten, wenn `DATABASE_URL` noch fehlt — die Sitemap enthält dann nur statische URLs. Für einen funktionierenden Shop **Preview/Production** brauchst du trotzdem `DATABASE_URL` (und übrige Pflicht-Env) vor dem ersten sinnvollen Deploy.

Empfohlen:

1. Migration lokal oder in CI gegen Staging testen (`npx prisma migrate deploy`).
2. Production-Migration als kontrollierter Schritt laut [OPERATIONS.md](./OPERATIONS.md).

Optional später: Build Hook oder separates Deploy-Job — erst nach klarer DB-Strategie.

### Domains

- Production: Custom Domain in Vercel → Domains.
- `AUTH_URL` und `NEXT_PUBLIC_SITE_URL` auf dieselbe kanonische HTTPS-URL setzen.

## 3. Alternative: Vercel CLI (lokal oder Codespace)

```bash
npm i -g vercel@latest
vercel login
vercel link
# Team/Projekt wählen oder neues Projekt anlegen
vercel env pull .env.local --environment=preview
```

`.vercel/` bleibt lokal (in `.gitignore`) — **nicht committen**.

Erster Preview-Deploy:

```bash
vercel
```

Production:

```bash
vercel --prod
```

Für dauerhafte Deployments ist **Git-Integration** (Abschnitt 2) trotzdem vorzuziehen.

## 4. GitHub Actions und Vercel zusammen

| Schritt | Wo |
| --- | --- |
| Lint, Tests, E2E, Lighthouse | GitHub Actions bei Push/PR |
| Next.js Build + Hosting | Vercel bei Push (wenn verknüpft) |

Branch Protection (GitHub → Settings → Branches → `main`):

- Require status checks: mindestens Jobs **Security**, **check**, **E2E** aus `ci.yml`.
- Optional: Vercel **Deployment** Check, sobald Git-Integration aktiv ist.

Secrets für CI (Repository → Settings → Secrets):

- `PAYPAL_SANDBOX_CLIENT_ID` / `PAYPAL_SANDBOX_CLIENT_SECRET` — bereits in `ci.yml` referenziert für E2E.

Vercel-Deploy-Secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) sind **nur nötig**, wenn ihr bewusst `vercel deploy --prebuilt` aus GitHub Actions steuern wollt. Standard: Vercel baut direkt aus GitHub.

## 5. Cloud-Entwicklung ohne lokalen Speicher

- **GitHub Codespaces:** `.devcontainer/devcontainer.json` → Repository → **Code → Codespaces → Create codespace**.
- Env in Codespace: **Settings → Secrets and variables → Codespaces** (gleiche Keys wie Vercel Preview, sandbox).
- Dev-Server: `npm run dev` → Port **3001** wird weitergeleitet.

## 6. Checkliste nach Anbindung

- [ ] Vercel-Projekt zeigt Deployments für `main` und PR-Branches.
- [ ] Preview-URL lädt Storefront (DB erreichbar, Env gesetzt).
- [ ] GitHub Actions grün auf dem letzten Push.
- [ ] Production-Env und Preview-Env getrennt.
- [ ] `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` passen zur Vercel-Domain.
- [ ] **`AUTH_SECRET`** für Preview **und** Production gesetzt → danach **Redeploy** (Build muss Secret kennen).
- [ ] **Admin-Login:** `npx prisma migrate deploy` gegen die Vercel-DB (lokal mit Production-/Preview-`DATABASE_URL` oder CI).
- [ ] **Admin-User** in derselben DB: einmalig `npm run db:seed` (nur Staging/Preview) oder `npm run admin:set-password` mit Ziel-`DATABASE_URL`.

### Admin-Login (Vercel) — Kurzablauf

1. Env: `DATABASE_URL`, `AUTH_SECRET` (Preview + Production), optional Production-`AUTH_URL`.
2. Code mit Auth-Fixes auf `main` (PR #17 o. Ä.) → Vercel-Deploy abwarten.
3. Schema: `DATABASE_URL="…" npx prisma migrate deploy`
4. Admin anlegen/Passwort:  
   `DATABASE_URL="…" npm run admin:set-password`  
   (interaktiv) **oder** Seed nur für nicht-Production: `npm run db:seed`
5. `/admin/login` testen — **kein** Passwort in der URL; Formular nutzt POST.

Lokal: eigenes `AUTH_SECRET` in `.env.local` (darf von Vercel abweichen).

Bei Problemen: Vercel **Build Logs**, fehlende Env-Variablen, Prisma/DB-Erreichbarkeit, Supabase-Pause prüfen.
