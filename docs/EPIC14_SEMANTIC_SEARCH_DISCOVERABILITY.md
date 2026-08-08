# Epic 14 — Semantische Suche und KI-Discoverability

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-14-semantic-search-and-ai-discoverability)

## Zielbild

Die erste Ausbaustufe verbessert **Suche und Auffindbarkeit**. Kunden finden Produkte auch mit natürlich formulierten Suchanfragen und Synonymen. Suchmaschinen und KI-Agenten erhalten konsistente, maschinenlesbare öffentliche Kataloginformationen. Agenten dürfen in dieser Stufe weder Warenkorb noch Checkout oder Kundenkonto verändern.

## Bestehende Basis

- klassische Storefront-Suche und Typeahead
- Sitemap, robots.txt, Canonicals und Product-/Offer-JSON-LD
- Open Graph und `/llms.txt`
- Kategorie- und Produktseiten

Diese Funktionen bleiben als robuster Fallback erhalten.

## Vorgeschlagene Slices

### Slice 1 — SEO-/Schema-Audit

- Organization/OnlineStore, WebSite/SearchAction, Breadcrumb und vorhandenes Product/Offer prüfen/ergänzen
- Branding-/Kontaktwerte aus Epic 11 verwenden
- CMS-Seiten aus Epic 12 in Sitemap/Canonical/Indexierungslogik integrieren
- Rich Results und strukturierte Daten automatisiert testen

### Slice 2 — Suchdokument und Index

- öffentliches Suchdokument aus Produkttitel, Beschreibung, Kategorie, Attributen und Verfügbarkeit
- Embeddings providerneutral erzeugen und nur bei relevanten Inhaltsänderungen aktualisieren
- Indexstatus, Fehler und Rebuild im Admin sichtbar
- inaktive Produkte, Draft-Seiten und personenbezogene Daten strikt ausschließen

### Slice 3 — Hybride Suche

- lexikalische Suche + semantische Ähnlichkeit + Geschäftsfilter
- Verfügbarkeit, Kategorie und aktive Varianten bleiben autoritative Filter
- nachvollziehbares Ranking, Grenzwerte und Fallback bei Provider-/Indexausfall
- Typeahead bleibt schnell und darf keine teure Generierung pro Tastendruck auslösen

### Slice 4 — KI-freundlicher öffentlicher Katalog

- `/llms.txt` präzisieren und auf kanonische öffentliche Ressourcen verweisen
- dokumentierter maschinenlesbarer Produktfeed mit stabilen IDs, URL, Preis, Währung, Verfügbarkeit und Aktualisierungszeit
- Cache-/ETag-Strategie und Rate-Limits
- keine nicht öffentlichen Lager-, Kunden- oder Admin-Daten

### Slice 5 — Qualität und Betrieb

- kuratierter deutscher Such-Evaluationssatz (Synonyme, Tippfehler, Intentionen, Nulltreffer)
- Metriken: Nulltreffer, Klickrate, Latenz, Fallback-Rate und Indexalter
- Kostenlimits, Batch-Reindex und Rollback auf klassische Suche

## Agentic-Commerce-Grenze v1

Erlaubt sind ausschließlich lesende Discoverability-Funktionen. Produktfeed und strukturierte Daten sind keine Preis- oder Bestandsreservierung. Schreibende Agentenaktionen, Warenkorb-/Checkout-APIs, delegierte Identität und Zahlungen benötigen ein eigenes späteres Epic samt Sicherheitsmodell.

## Exit-Kriterien

1. Natürlich formulierte und synonyme Suchanfragen verbessern den kuratierten Evaluationssatz messbar.
2. Provider-/Indexausfall fällt kontrolliert auf klassische Suche zurück.
3. Preis, Verfügbarkeit und Sichtbarkeit stammen immer aus autoritativen Shopdaten.
4. Öffentliche Agentenressourcen enthalten keine personenbezogenen oder internen Daten.
5. Strukturierte Daten, Feed und Sitemap widersprechen sich nicht.

## Nicht-Ziele

- Agenten dürfen bestellen, bezahlen oder Konten verändern
- personalisierte Suche aus Kundenprofilen
- automatische Chatberatung in v1
- Ersatz der Datenbank als Preis-/Bestandsquelle
