# Epic 5 — Gruppenbuchungen und Terminverwaltung

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-5-live-workshop-booking)

## Zielbild

Admins erstellen und veröffentlichen buchbare Gruppentermine. Ein Termin definiert unter anderem Ort, Beginn/Ende, Preis, minimale Gesamtteilnehmerzahl und maximale Kapazität, zum Beispiel **min. 3 / max. 10 Personen**. Mehrere Kunden teilen die Kapazität: sowohl eine Buchung über 10 Plätze als auch zwei Buchungen über je 5 Plätze sind bei Kapazität 10 möglich.

Der Kalender kann als Block auf einer CMS-Seite (Epic 12) und optional auf ausgewählten Produktdetailseiten eingebunden werden.

## Fachliche Klarstellung

- `minimumParticipants` bezeichnet die Mindestzahl aller bestätigten Plätze, ab der ein Termin stattfinden kann — nicht die Mindestmenge pro Kunde.
- `capacity` ist die maximale Summe bestätigter plus temporär gehaltener Plätze.
- Eine Buchung enthält eine frei wählbare Teilnehmerzahl innerhalb verfügbarer Kapazität und optionaler Admin-Grenzen pro Buchung.
- „Termin freigeben“ bedeutet zunächst **veröffentlichen**. Buchungen werden bei verfügbarer Kapazität automatisch bestätigt; ein manueller Freigabeschritt pro Buchung ist nicht vorgesehen.

## Abhängigkeiten

- Epic 1: atomare Reservierungen, Inbox/Outbox, Audit-Historie
- Epic 3: Kundenportal; Gastbuchung bleibt möglich
- Epic 4: providerbestätigte Zahlung und Refunds für kostenpflichtige Termine
- Epic 12: Einbettung als CMS-Block

## Vorgeschlagene Slices

### Slice 1 — Domäne und Admin-Termine

- Session: Titel, Beschreibung, Zeitzone, Beginn/Ende, Ort, Preis, Währung
- `draft` / `published` / `cancelled` / `completed`
- `minimumParticipants`, `capacity`, optionale maximale Plätze pro Buchung
- globale und terminbezogene Selbststornierungsfrist
- Admin-Liste, Formular, Freigabe und Audit

**Status:** umgesetzt (Admin). `/admin/termine`: Entwurf anlegen/bearbeiten, veröffentlichen, absagen, abschließen; shopweite Storno-Frist (Std. 48h); Audit `workshop_session_events` + Outbox. Storefront-Kalender und Checkout folgen in Slice 2–3.

### Slice 2 — Storefront-Kalender und Einbettung

- Kalender/Liste mit freien Plätzen und Status
- Einbettung auf CMS-Seiten und ausgewählten PDPs
- Serverautoritativ: ausgebucht, buchbar, abgesagt, Mindestteilnehmer noch offen
- WCAG 2.2 AA, Keyboard und mobile Darstellung

### Slice 3 — Kapazität und Checkout

- Atomarer Capacity Hold mit TTL während Checkout
- Buchung mehrerer Plätze in einer Order
- Kein Overselling bei parallelen Buchungen des letzten Platzes
- Kostenlose und kostenpflichtige Termine im Datenmodell unterstützen; kostenpflichtige Finalisierung erst nach bestätigter Zahlung

### Slice 4 — Bestätigung und Kundenkonto

- Bestätigungs-/Storno-E-Mail und Kalendereintrag
- Gastbuchung über verifizierte Kontaktadresse
- Kundenkonto zeigt Termine; Selbststornierung nur innerhalb konfigurierter Frist

### Slice 5 — Admin-Teilnehmerverwaltung

- Teilnehmerliste, gebuchte Plätze, Zahlung, Anwesenheit, Storno
- Gesamtauslastung und Status zur Mindestteilnehmerzahl
- Terminabsage mit Benachrichtigung und ggf. Refund-Workflow

### Slice 6 — Resilience und Betrieb

- Ablauf abgebrochener Holds
- Idempotente Payment-/Storno-/Refund-Verarbeitung
- Alerts für festhängende Holds, negative Kapazität und unvollständige Finalisierung
- Lasttest für konkurrierende Buchungen

## Exit-Kriterien

1. Die Summe aus Holds und bestätigten Plätzen überschreitet nie die Kapazität.
2. Mehrere Kunden können Teilmengen buchen; Beispiel `2 × 5` füllt Kapazität 10 korrekt.
3. Admin-Freigabe steuert Sichtbarkeit und Buchbarkeit.
4. Selbststornierung respektiert die serverseitige Frist und gibt Plätze höchstens einmal frei.
5. Kalender funktioniert auf CMS-Seite und PDP ohne duplizierte Buchungslogik.

## Noch zu entscheiden

- Warteliste ja/nein
- wiederkehrende Termine oder zunächst einzelne Sessions
- iCal-Datei und/oder externe Kalendersynchronisation
- Verhalten unter Mindestteilnehmerzahl (automatische Absage oder Admin-Entscheidung)
- Refund-/Gutscheinregel bei fristgerechter Stornierung
