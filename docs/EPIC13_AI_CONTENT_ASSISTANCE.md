# Epic 13 — KI-gestützte Content- und Bildwerkzeuge

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-13-ai-assisted-content-and-images)  
Agent-Handoff: [EPIC13_AGENT_HANDOFF.md](./EPIC13_AGENT_HANDOFF.md) · ADR: [0010-ai-content-assistance-port.md](./adr/0010-ai-content-assistance-port.md)

## Zielbild

KI unterstützt Admins bei Produkttexten, SEO-Inhalten, Alt-Texten sowie Bildgenerierung und -bearbeitung. Jede Ausgabe ist ein **Entwurf** und wird erst nach ausdrücklicher Bestätigung in ein Produkt oder eine CMS-Seite übernommen. OpenAI ist der erste Provider; die Anwendung bleibt providerneutral.

## Kernprinzipien

- Provider-Interface statt OpenAI-Aufrufe in UI oder Domänenlogik
- Human-in-the-loop: Generieren → Prüfen/Bearbeiten → Übernehmen
- Kein automatisches Veröffentlichen
- Geheimnisse nur serverseitig; Kosten-, Rate- und Größenlimits
- Prompt-/Modell-/Provider-Metadaten und Admin-Aktion auditierbar
- Keine Kunden-, Bestell-, Adress- oder sonstigen personenbezogenen Daten in Prompts

## Anwendungsfälle v1

- Kurz- und Langbeschreibung aus Produktfakten
- SEO-Titel und Meta-Description
- strukturierte Bulletpoints/USPs
- Alt-Text aus vorhandenem Produktbild
- neues Produkt-/Lifestyle-Bild generieren
- Bildvarianten: Hintergrund entfernen/ersetzen, Format erweitern, Zuschnittsvorschlag

## Vorgeschlagene Slices

1. **ADR und Provider-Port:** Text-, Vision-, Image-Generation und Moderation als getrennte Fähigkeiten; OpenAI-Adapter. ✅ (Slice 1)
2. **Admin-Konfiguration:** Provider, Modellprofile, Limits und verschlüsselte Server-Keys; keine Secrets im Client/DB-Klartext. ✅ (Slice 2)
3. **Textassistent:** Produktformular mit Vorschau/Diff und explizitem Übernehmen einzelner Felder.
4. **Bildassistent:** Upload/Quellbild, Prompt, Vorschau, Moderation, explizite Übernahme in dauerhaften Medienspeicher.
5. **CMS-Integration:** Text-/Bildentwürfe für ausgewählte Blöcke, weiterhin ohne Auto-Publish.
6. **Betrieb:** Usage-/Kostenmetriken, Timeouts, Retry nur für sichere Requests, Quoten und verständliche Providerfehler.

## Providervertrag

Der interne Port liefert normalisierte Ergebnisse und Metadaten. Providerfähigkeiten werden zur Laufzeit geprüft; fehlt etwa Bildbearbeitung, bleibt die Aktion deaktiviert statt still auf inkompatibles Verhalten auszuweichen. Ein Providerwechsel darf keine Produkt- oder CMS-Datenmigration verlangen.

## Datenschutz, Rechte und Sicherheit

- Vor Request werden erlaubte Felder explizit ausgewählt; kein vollständiger DB-Dump.
- Generierte Bilder bleiben bis zur Übernahme temporär und erhalten definierte Retention.
- Moderation und Dateivalidierung vor dauerhafter Speicherung.
- UI weist auf Prüfung von Fakten, Urheber-/Markenrechten und irreführenden Darstellungen hin.
- Prompts dürfen keine internen Secrets oder personenbezogenen Daten enthalten.

## Exit-Kriterien

1. OpenAI kann als erster Provider angebunden werden, ohne Providerdetails in Produkt-/CMS-Modulen.
2. Kein KI-Ergebnis verändert Daten oder Veröffentlichung ohne Admin-Bestätigung.
3. Text und Bildpfade besitzen Limits, Fehlerzustände, Audit und Kostenmetrik.
4. Provider kann später durch einen zweiten Adapter ersetzt/ergänzt werden.
5. Automatisierte Tests beweisen Secret-Isolation, Bestätigungsgrenze und Providerfehler-Fallback.

## Nicht-Ziele

- autonome Veröffentlichung
- KI-Kundenservice oder personenbezogene Profilbildung
- Training/Fine-Tuning mit Kundendaten
- automatische rechtliche oder medizinische Aussagen
