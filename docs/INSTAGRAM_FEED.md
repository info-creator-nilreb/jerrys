# Instagram-Feed (OAuth + CMS)

Umsetzung des Live-Feeds für den CMS-Block **Social / Reviews** (Bilder zuerst).

## Flow

1. Admin: **Einstellungen → Integrationen → Mit Instagram verbinden**
2. OAuth (Instagram Professional / `instagram_business_basic`)
3. Long-Lived Token verschlüsselt in `instagram_connections`
4. Sync nach `instagram_media_cache` (Cron + manueller Button unter Integrationen); Bilder idealerweise Blob-Spiegel
5. Storefront: bestehendes `HomepageSocialCarousel` (Desktop Embla / Mobile / Reduced-Motion-Grid)
6. Kuratierte Fallback-Bilder und Amazon-Zitate: **Inhalte → Marketing**

## Env

Siehe `.env.example`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, Site-URL, optional `INSTAGRAM_REDIRECT_URI`, bei Mode `facebook` zusätzlich `INSTAGRAM_FB_LOGIN_CONFIG_ID`, `INTEGRATIONS_ENCRYPTION_KEY`.

Meta App: Redirect URI exakt `{SITE}/api/admin/instagram/callback`. App Review für Production.

### Auth-Mode und „Invalid platform app“

Zwei gültige Setups:

| `INSTAGRAM_AUTH_MODE` | Credentials | Meta-Produkt |
|-----------------------|-------------|--------------|
| `instagram` (Default) | **Instagram** App ID/Secret unter Instagram → API setup with Instagram login | Business Login for Instagram |
| `facebook` | **Meta** App ID/Secret unter App-Einstellungen → Allgemeines | Facebook Login for Business + IG an Page |

Wenn im Dashboard **Facebook Login for Business** aktiv ist und Connect mit **Invalid platform app** oder **Invalid Scopes** scheitert:

1. Vercel: `INSTAGRAM_AUTH_MODE=facebook`
2. `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` = Meta App ID + Secret (Allgemeines)
3. Dieselbe Callback-URL unter **Facebook Login for Business → Einstellungen → Gültige OAuth-Redirect-URIs**
4. **Facebook Login for Business → Konfigurationen**: Login-Config anlegen mit u. a.  
   `instagram_basic`, `pages_show_list`, `pages_read_engagement`  
   → Config-ID nach Vercel als `INSTAGRAM_FB_LOGIN_CONFIG_ID`
5. Instagram Professional-Konto mit einer **Facebook-Page** verknüpfen
6. Redeploy, erneut verbinden

Ohne Config-ID sendet die App klassische `scope=`-Parameter — Meta antwortet bei FL4B oft mit **Invalid Scopes**.

### Domain-Fehler („Domain … nicht in den Domains der App“)

Meta zeigt diese Facebook-Fehlerseite, wenn `redirect_uri` eine Domain hat, die **nicht** unter App-Domains steht — häufig weil:

- auf einer **Vercel-Preview** verbunden wurde (`AUTH_URL` wird dort auf den Preview-Host umgebogen), oder
- `NEXT_PUBLIC_SITE_URL` / `INSTAGRAM_REDIRECT_URI` fehlen und OAuth auf einen ephemeral Host fällt, oder
- in Meta App-Domains / OAuth-Redirects die Production-Domain fehlt.

**Fix (Code + Config):**

1. Vercel **Production** (Environment = Production):  
   `NEXT_PUBLIC_SITE_URL=https://ecom-seven-livid.vercel.app`  
   und empfohlen  
   `INSTAGRAM_REDIRECT_URI=https://ecom-seven-livid.vercel.app/api/admin/instagram/callback`  
   + Redeploy
2. Meta → App-Einstellungen → **Allgemeines** → **App-Domains**: `ecom-seven-livid.vercel.app`  
   (nur Hostname, ohne `https://`)
3. Meta → **Facebook Login** → **Gültige OAuth-Redirect-URIs**: exakt  
   `https://ecom-seven-livid.vercel.app/api/admin/instagram/callback`
4. Verbinden **nur** über  
   `https://ecom-seven-livid.vercel.app/admin/inhalte/marketing`  
   (nicht über Preview — die App blockiert OAuth sonst vor dem Meta-Redirect)

Die Admin-Diagnose unter Marketing zeigt Redirect-URI, Meta-App-Domain und eine kurze Checkliste.

## CMS

Block-Felder `socialSource` (`auto` | `instagram` | `curated`) und `socialLimit`. Default `auto`: Feed wenn Cache gefüllt, sonst kuratierte Marketing-Bilder.

## Ops

- Migration: `20260811170000_instagram_oauth_feed`
- Sync läuft in `/api/internal/commerce-maintenance` wenn verbunden
- Sync holt per Pagination **12 Standbilder/Carousel-Cover** (Videos/Reels werden übersprungen, Pagination läuft weiter)
- Storefront-Block `socialLimit` Default 12; nach Connect/Deploy ggf. **Jetzt synchronisieren**
- Trennen löscht Verbindung + Cache
