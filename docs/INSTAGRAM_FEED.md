# Instagram-Feed (OAuth + CMS)

Umsetzung des Live-Feeds für den CMS-Block **Social / Reviews** (Bilder zuerst).

## Flow

1. Admin: **Inhalte → Marketing → Mit Instagram verbinden**
2. OAuth (Instagram Professional / `instagram_business_basic`)
3. Long-Lived Token verschlüsselt in `instagram_connections`
4. Sync nach `instagram_media_cache` (Cron + manueller Button); Bilder idealerweise Blob-Spiegel
5. Storefront: bestehendes `HomepageSocialCarousel` (Desktop Embla / Mobile / Reduced-Motion-Grid)

## Env

Siehe `.env.example`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, Site-URL, optional `INSTAGRAM_REDIRECT_URI`, `INTEGRATIONS_ENCRYPTION_KEY`.

Meta App: Redirect URI exakt `{SITE}/api/admin/instagram/callback`. App Review für Production.

### Auth-Mode und „Invalid platform app“

Zwei gültige Setups:

| `INSTAGRAM_AUTH_MODE` | Credentials | Meta-Produkt |
|-----------------------|-------------|--------------|
| `instagram` (Default) | **Instagram** App ID/Secret unter Instagram → API setup with Instagram login | Business Login for Instagram |
| `facebook` | **Meta** App ID/Secret unter App-Einstellungen → Allgemeines | Facebook Login for Business + IG an Page |

Wenn im Dashboard **Facebook Login for Business** aktiv ist und Connect mit **Invalid platform app** scheitert:

1. Vercel: `INSTAGRAM_AUTH_MODE=facebook`
2. `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` = Meta App ID + Secret (Allgemeines)
3. Dieselbe Callback-URL unter **Facebook Login → Gültige OAuth-Redirect-URIs**
4. Instagram Professional-Konto mit einer **Facebook-Page** verknüpfen
5. Redeploy, erneut verbinden

### Domain-Fehler („Domain … nicht in den Domains der App“)

OAuth braucht eine **feste** Redirect-URL — keine Vercel-Preview-Hosts (`*-alexbs-projects-*.vercel.app`).

1. Vercel Production: `NEXT_PUBLIC_SITE_URL=https://ecom-seven-livid.vercel.app` (oder Custom Domain) und/oder `INSTAGRAM_REDIRECT_URI=https://…/api/admin/instagram/callback`
2. Meta → App-Einstellungen → **Allgemeines** → **App-Domains**: `ecom-seven-livid.vercel.app`
3. Meta → **Facebook Login** → **Gültige OAuth-Redirect-URIs**: exakt  
   `https://ecom-seven-livid.vercel.app/api/admin/instagram/callback`
4. Verbinden über die **Production**-Admin-URL, nicht über einen Preview-Link

## CMS

Block-Felder `socialSource` (`auto` | `instagram` | `curated`) und `socialLimit`. Default `auto`: Feed wenn Cache gefüllt, sonst kuratierte Marketing-Bilder.

## Ops

- Migration: `20260811170000_instagram_oauth_feed`
- Sync läuft in `/api/internal/commerce-maintenance` wenn verbunden
- Trennen löscht Verbindung + Cache
