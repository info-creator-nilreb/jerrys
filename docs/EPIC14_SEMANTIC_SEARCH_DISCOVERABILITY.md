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

**Status:** umgesetzt (Livegang-Paket). Siteweites JSON-LD (`SiteJsonLd`: Organization/OnlineStore + WebSite/SearchAction aus ShopSettings), BreadcrumbList an `StorefrontBreadcrumbs`, Product/Offer mit Brand-`@id`, Homepage-Metadata aus CMS, CMS-Seiten in Sitemap/`metadataForContentPage`/Brotkrümeln; Unit-Tests `tests/unit/structured-data.test.ts`.

### Slice 2 — Suchdokument und Index

- öffentliches Suchdokument aus Produkttitel, Beschreibung, Kategorie, Attributen und Verfügbarkeit
- Embeddings providerneutral erzeugen und nur bei relevanten Inhaltsänderungen aktualisieren
- Indexstatus, Fehler und Rebuild im Admin sichtbar
- inaktive Produkte, Draft-Seiten und personenbezogene Daten strikt ausschließen

**Status:** umgesetzt (Livegang-Paket). Prisma `ProductSearchDocument` + `SearchIndexState`; Document-Builder (`features/catalog/domain/product-search-document.ts`) nur für aktive Produkte ohne Kundendaten; Sync/Rebuild (`sync-product-search-index`); Embedding-Port + NotConfigured + OpenAI `/embeddings` hinter `features/integrations` (Credentials analog KI-Content, eigener Port); Admin-Panel unter Einstellungen → Integrationen; Unit-Tests `product-search-document`, `embedding-port`, `sync-product-search-index`. Hybride Storefront-Suche folgt in Slice 3.

### Slice 3 — Hybride Suche

- lexikalische Suche + semantische Ähnlichkeit + Geschäftsfilter
- Verfügbarkeit, Kategorie und aktive Varianten bleiben autoritative Filter
- nachvollziehbares Ranking, Grenzwerte und Fallback bei Provider-/Indexausfall
- Typeahead bleibt schnell und darf keine teure Generierung pro Tastendruck auslösen

**Status:** umgesetzt (Livegang-Paket). Domain-Ranking (`hybrid-product-search`: Cosine, Lexik-Score, Hybrid-Gewichte/Grenzen); Application `searchStorefrontProductsHybrid` lädt gespeicherte Embeddings, erzeugt **ein** Query-Embedding für die Vollsuche, fällt bei NotConfigured/Providerfehler/leerem Index auf Lexik zurück; Storefront `/produkte?q=` verdrahtet; Typeahead (`product-suggest`) bewusst rein lexikalisch; Unit-Tests `hybrid-product-search`, `hybrid-storefront-search`.

### Slice 4 — KI-freundlicher öffentlicher Katalog

- `/llms.txt` präzisieren und auf kanonische öffentliche Ressourcen verweisen
- dokumentierter maschinenlesbarer Produktfeed mit stabilen IDs, URL, Preis, Währung, Verfügbarkeit und Aktualisierungszeit
- Cache-/ETag-Strategie und Rate-Limits
- keine nicht öffentlichen Lager-, Kunden- oder Admin-Daten

**Status:** umgesetzt (Livegang-Paket). `GET /llms.txt` listet kanonische öffentliche Pfade inkl. Sitemap und Feed; `GET /katalog.json` liefert nur aktive Produkte (ID, URL, Preis, Währung, `in_stock`/`out_of_stock`, `updatedAt`) ohne Lagermengen/Kundendaten; ETag + `Cache-Control` + IP-Rate-Limit; Eintrag in `SECURITY_SURFACE.md`; Unit-Tests `public-product-feed`, `public-catalog-feed-rate-limit`.

### Slice 5 — Qualität und Betrieb

- kuratierter deutscher Such-Evaluationssatz (Synonyme, Tippfehler, Intentionen, Nulltreffer)
- Metriken: Nulltreffer, Klickrate, Latenz, Fallback-Rate und Indexalter
- Kostenlimits, Batch-Reindex und Rollback auf klassische Suche

**Status:** umgesetzt (MVP, Livegang-Paket). Eval-Satz `features/catalog/domain/search-eval-set.de.ts`; Metrik-Hilfen (`nullHitRate`, `fallbackRate`, `meanLatencyMs`, `indexAgeHours`) in `search-quality-metrics.ts`; Admin-Panel zeigt Indexalter und Hinweis auf lexikalischen Fallback; Batch-Rebuild bleibt im Integrationen-Panel; Klickrate/Live-Telemetrie und harte Kostenlimits bewusst schlank (nicht im MVP-Scope). Dokumentierter Fallback siehe unten.

### Lexikalischer Fallback (Betrieb)

Die Storefront-Vollsuche (`searchStorefrontProductsHybrid` → `/produkte?q=`) kombiniert Lexik und Semantik. Bei fehlender Embedding-Konfiguration, leerem Index, Providerfehler oder fehlgeschlagenem Query-Embedding liefert sie **kontrolliert nur die klassische lexikalische Suche** (`mode: lexical_fallback`). Typeahead (`/api/storefront/product-suggest`) ist bewusst rein lexikalisch und erzeugt kein Query-Embedding pro Tastendruck. Ein vollständiger Rollback auf Lexik ist damit der Default-Pfad bei Ausfall — kein separater Feature-Flag nötig.

## Agentic-Commerce-Grenze v1

Erlaubt sind ausschließlich lesende Discoverability-Funktionen. Produktfeed und strukturierte Daten sind keine Preis- oder Bestandsreservierung. Schreibende Agentenaktionen, Warenkorb-/Checkout-APIs, delegierte Identität und Zahlungen benötigen ein eigenes späteres Epic samt Sicherheitsmodell.

## Exit-Kriterien

1. Natürlich formulierte und synonyme Suchanfragen verbessern den kuratierten Evaluationssatz messbar. ✅ Eval-Satz vorhanden; Hybrid-Ranking + Unit-Tests.
2. Provider-/Indexausfall fällt kontrolliert auf klassische Suche zurück. ✅ `lexical_fallback` in Application + Tests + Admin-Hinweis.
3. Preis, Verfügbarkeit und Sichtbarkeit stammen immer aus autoritativen Shopdaten. ✅ Feed/JSON-LD/Storefront aus aktiven Produkten + Default-Variante.
4. Öffentliche Agentenressourcen enthalten keine personenbezogenen oder internen Daten. ✅ Feed ohne Lager/Kunde; `SECURITY_SURFACE` + Tests.
5. Strukturierte Daten, Feed und Sitemap widersprechen sich nicht. ✅ dieselben aktiven Produkt-URLs (`/produkte/{slug}`), Verfügbarkeit analog JSON-LD InStock/OutOfStock.

**MVP-Exit:** erfüllt (Livegang-Paket).

## Nicht-Ziele

- Agenten dürfen bestellen, bezahlen oder Konten verändern
- personalisierte Suche aus Kundenprofilen
- automatische Chatberatung in v1
- Ersatz der Datenbank als Preis-/Bestandsquelle
