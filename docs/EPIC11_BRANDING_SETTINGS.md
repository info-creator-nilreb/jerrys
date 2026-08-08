# Epic 11 — Zentrale Shop-Einstellungen und Branding

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-11-central-shop-settings-and-branding)

## Zielbild

Eine Shop-Installation besitzt genau **ein aktives Branding**. Admins konfigurieren es zentral unter `/admin/einstellungen`, ohne Codeänderung oder Redeploy. Die Konfiguration wirkt konsistent in Storefront, Admin-Login, E-Mails und PDFs.

## Konfigurierbarer Umfang

- Shopname, Kurzbeschreibung und öffentliche Basisdaten
- Logo für hellen/dunklen Hintergrund, Favicon und Social-/OG-Bild
- Primärfarbe, Hover-/Fokusfarbe und ausgewählte semantische Farbtokens
- Kontaktdaten, Geschäftsanschrift, Support-E-Mail/-Telefon
- Social Links
- Absendername und visuelles Branding für E-Mails
- Logo, Absender- und Geschäftsangaben für Rechnungen/PDFs

Schriftarten werden nur aus einer kuratierten, lokal bzw. datenschutzkonform bereitgestellten Auswahl angeboten; keine freie CSS-Eingabe.

## Vorgeschlagene Slices

1. **ADR und Schema:** `ShopSettings` als Singleton, validierte Farb-/URL-/Kontaktfelder, Cache-/Invalidierungsstrategie.
2. **Medien:** Logo/Favicon/OG-Upload in dauerhaftem Object Storage; Typ-, Größen- und Bildvalidierung.
3. **Admin:** Einstellungen mit Vorschau, Speichern, Fehler-/Erfolgszustand und Audit.
4. **Storefront:** semantische CSS-Tokens serverseitig anwenden; Header/Footer/Metadata dynamisieren.
5. **Ausgaben:** E-Mail-Layout, Rechnungs-PDF und Admin-Login auf dieselbe Konfiguration umstellen.
6. **Migration:** bestehende jerry’s-Werte als Initialdaten übernehmen; sichere Fallbacks bei fehlenden Assets.

## Sicherheits- und Qualitätsgrenzen

- Keine freie CSS-/JavaScript-Eingabe.
- Farbkombinationen müssen WCAG 2.2 AA erfüllen oder vor Speicherung klar warnen/blockieren.
- Uploads niemals im ephemeren Vercel-Dateisystem speichern.
- Eine visuell dominante Primäraktion bleibt pro Ansicht erhalten.
- Konfiguration wird auditiert und erst nach erfolgreicher Serverpersistenz angezeigt.

## Exit-Kriterien

1. Admin kann Branding und Geschäftsinformationen ohne Deploy ändern.
2. Storefront, Admin-Login, E-Mail und PDF zeigen konsistente Werte.
3. Fehlende oder fehlerhafte Assets brechen Checkout, E-Mail oder PDF nicht.
4. Bestehendes jerry’s-Branding ist nach Migration unverändert.

## Nicht-Ziele

- mehrere aktive Themes oder Shops
- Multi-Tenant/White-Label-SaaS
- freie Template-, CSS- oder Komponentenbearbeitung
- Plugin- oder Theme-Marktplatz
