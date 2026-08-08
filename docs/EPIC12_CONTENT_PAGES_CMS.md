# Epic 12 — CMS light für Startseite und Inhaltsseiten

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-12-content-pages-and-cms-light)

## Zielbild

Admins gestalten Startseite und weitere Seiten mit einem bewusst begrenzten Satz geprüfter Inhaltsblöcke. Seiten besitzen frei definierbare, eindeutige URLs, einen `draft`-/`published`-Status und eine Vorschau. Eine Versionshistorie ist nicht vorgesehen.

## Seiten und URLs

- Startseite bleibt `/`.
- Bestehende Seiten werden bei Migration mit ihren aktuellen URLs angelegt, insbesondere `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/versand` und weitere vorhandene Infoseiten.
- Freie Slugs werden gegen reservierte Systempfade wie `/admin`, `/api`, `/checkout`, `/produkte`, `/kategorien`, `/kollektionen`, `/warenkorb` und `/konto` validiert.
- URL-Änderungen benötigen Redirect-Felder oder werden vor Veröffentlichung blockiert, bis eine Redirect-Entscheidung vorliegt.
- Rechtstexte können im CMS gepflegt werden, behalten aber eigene Seitentypen, Pflichtfelder und restriktive Sanitization.

## Kuratierte Blöcke (v1)

- Hero mit Bild, Text und CTA
- Rich Text
- Bild/Text-Kombination
- Produkt- oder Kategorieauswahl
- kuratierte Produktliste
- USP-/Feature-Leiste
- FAQ
- Social-/Review-Inhalte aus bestehender Startseitenpflege
- Gruppentermin-Kalender aus Epic 5

Keine freie React-, HTML-, CSS- oder JavaScript-Ausführung.

## Vorgeschlagene Slices

1. **ADR und Modell:** `ContentPage`, geordnete `ContentBlock`-Daten, Seitentyp, Slug, SEO-Felder, Status.
2. **Renderer:** typisierte Block-Registry mit Server Components, Schema-Validierung und sicheren Fallbacks.
3. **Admin-Editor:** Block hinzufügen, konfigurieren, umordnen, entfernen; explizites Speichern.
4. **Draft/Publish/Preview:** nicht öffentliche signierte Preview-URL; atomare Veröffentlichung.
5. **Freie Seiten:** Routing, Navigation/Linkauswahl, Slug-/Reserved-Path-Schutz, Redirect-Konzept.
6. **Migration:** aktuelle Startseite, Marketingdaten und Rechtstexte ohne URL-Verlust übernehmen.
7. **Buchungseinbettung:** Kalenderblock und optionale PDP-Verknüpfung ohne duplizierte Buchungslogik.

## SEO und Sicherheit

- Pro Seite SEO-Titel, Description, OG-Bild, Canonical und Indexierbarkeit.
- Drafts dürfen weder öffentlich erreichbar noch in Sitemap/Navigation enthalten sein.
- Rich Text serverseitig sanitizen; Links und Medien validieren.
- Preview-Tokens kurzlebig, nicht erratbar und nicht indexierbar.
- Rechtstextänderungen auditieren; rechtliche Freigabe bleibt organisatorische Verantwortung.

## Exit-Kriterien

1. Admin kann Startseite und neue Seiten als Draft bearbeiten, sicher vorschauen und veröffentlichen.
2. Bestehende öffentliche URLs funktionieren nach Migration unverändert.
3. Drafts sind für unautorisierte Nutzer und Crawler unsichtbar.
4. Alle Blöcke funktionieren responsiv und barrierearm.
5. Kein Block kann beliebigen Code oder unsanitisiertes HTML ausführen.

## Nicht-Ziele

- generischer Shopify-/Webflow-Page-Builder
- Versionierung oder kollaborative Bearbeitung
- mehrsprachige Inhalte in v1
- freie Templates, Plugins oder Drittanbieter-Blöcke
