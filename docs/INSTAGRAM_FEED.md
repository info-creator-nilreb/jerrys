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

### Wichtig: Instagram App ID ≠ Meta App ID

Fehler **Invalid platform app** bedeutet fast immer: In `INSTAGRAM_APP_ID` / `_SECRET` steht die **Meta-/Facebook-App-ID** (Dashboard-Kopf), nicht die **Instagram App ID**.

Richtig holen:
1. App Dashboard → **Instagram** → **API setup with Instagram login**
2. Abschnitt **Business login settings**
3. Dort **Instagram App ID** und **Instagram App Secret** kopieren → Vercel Env → Redeploy

Die allgemeine App-ID oben links im Dashboard funktioniert für diesen OAuth-Flow nicht.

## CMS

Block-Felder `socialSource` (`auto` | `instagram` | `curated`) und `socialLimit`. Default `auto`: Feed wenn Cache gefüllt, sonst kuratierte Marketing-Bilder.

## Ops

- Migration: `20260811170000_instagram_oauth_feed`
- Sync läuft in `/api/internal/commerce-maintenance` wenn verbunden
- Trennen löscht Verbindung + Cache
