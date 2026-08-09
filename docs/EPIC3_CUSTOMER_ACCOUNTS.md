# Epic 3 — Kundenkonten und Datenschutz

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-3-customers-and-privacy)

## Zielbild

Kunden können sich per **E-Mail/Passwort oder Magic Link** anmelden und ihre Bestellungen, Adressen und gebuchten Gruppentermine verwalten. Gast-Checkout bleibt möglich. Bestehende Gastbestellungen werden erst nach verifizierter E-Mail-Adresse zugeordnet; eine identische E-Mail allein reicht nie als Identitätsnachweis.

## Abhängigkeiten

- Epic 0: Auth-Provider/-Betriebsmodell per ADR festlegen.
- Epic 1: bestehende Bestell-, Audit- und Outbox-Grundlagen.
- Epic 5: Terminansicht und Stornierung im Kundenkonto.

## Nicht-Ziele

- Social Login in der ersten Ausbaustufe
- Loyalty, Wunschlisten oder öffentliche Profile
- Zusammenführen verschiedener Identitäten ohne erneute Verifikation
- Kunden-Impersonation ohne strikten Support- und Audit-Workflow

## Vorgeschlagene Slices

### Slice 1 — Identität und Authentifizierung

- `Customer` / `CustomerIdentity` statt Ableitung aus Bestell-E-Mails
- Registrierung, E-Mail-Verifikation, Passwort-Login und Magic Link
- Passwort vergessen, Sessionverwaltung und Rate-Limits
- Gastbestellungen bleiben ohne Konto möglich

**Status:** umgesetzt (ADR-0005). Auth.js bleibt Session-Mechanismus; Identitäten und One-Time-Tokens liegen in Postgres (`customers`, `customer_identities`, `customer_auth_tokens`). Storefront: Login als Header-Popover, `/konto/registrieren`, Magic-Link-Callback unter `GET /konto/magic-link`, Verifikation, Passwort-Reset; minimale `/konto`-Landing. Keine Gastbestell-Zuordnung und keine Epic-5-Termine in Slice 1.

### Slice 2 — Kundenportal und Bestellungen

- `/konto`, `/konto/bestellungen`, geschützte Bestelldetails
- Nur Bestellungen der verifizierten Identität
- Leere, ladende, fehlgeschlagene und mobile Zustände

**Status:** umgesetzt. `orders.customer_id` (optional) verknüpft Bestellungen mit dem Konto; Checkout setzt die ID bei angemeldetem, verifiziertem Kunden. Portal listet/zeigt nur über `customerId` — nie über E-Mail allein. Fremde Bestellnummern → 404. Gast-Checkout bleibt ohne Konto möglich; historische Gastbestellungen folgen in Slice 4.

### Slice 3 — Adressbuch

- Rechnungs- und Lieferadressen anlegen, bearbeiten, löschen, Standard wählen
- Checkout kann Adressen übernehmen; Bestellung behält unveränderliche Snapshots

**Status:** umgesetzt. Tabelle `customer_addresses`; Portal unter `/konto/adressen` (nur verifizierte Konten). Checkout übernimmt Standard-Liefer- und ggf. abweichende Rechnungsadresse per `getCheckoutAddressPrefillForCustomer`. Bestell-Snapshots unverändert.

**Adresseingabe (Checkout und Adressbuch):** progressive Reihenfolge **PLZ → Ort → Straße und Hausnummer** über `components/storefront/smart-address-fields.tsx`. Vorschläge (max. 5 pro Feld) kommen aus amtlichen Verzeichnissen der OpenPLZ API (DE/AT/CH/LI) über `GET /api/storefront/address-suggest`; eine eindeutige PLZ ergänzt den Ort automatisch. Ohne Treffer erscheint ein Hinweis, die Eingabe bleibt möglich — harte Fehler kommen nur aus Formatprüfung (`lib/checkout/postal-code-validation.ts`, `lib/checkout/address-line-validation.ts`) und Server-Validierung. Länder ohne Datenquelle verhalten sich wie normale Freitextfelder.

**Länder-Vorauswahl:** `lib/shop/preferred-shipping-country.ts` — Geo-Land des CDN (`x-vercel-ip-country`, nur wenn belieferbar), sonst `DE`, sonst erstes Versandland. Vorher gewann die alphabetische Sortierung der Versandländer (z. B. „AT“).

**Adressauswahl im Checkout:** Verifizierte Kunden mit gespeicherten Adressen wählen im Checkout über „Gespeicherte Lieferadresse“ bzw. „Gespeicherte Rechnungsadresse“; die Standardadresse ist vorausgewählt, „Neue Adresse eingeben …“ leert die Felder. Bei einer neuen Adresse kann sie über eine Checkbox nach der Bestellung im Adressbuch abgelegt werden — bewusst **nach** der Bestellung und ohne Einfluss auf deren Ergebnis.

**Migration:** `npm run db:migrate:deploy` (siehe [OPERATIONS.md](./OPERATIONS.md#migrationen-ausführen)). Ohne angewandte Migration meldet das Formular verständlich, dass das Adressbuch noch nicht eingerichtet ist.

### Slice 4 — Gastbestellungen sicher zuordnen

- Nach Registrierung/Magic-Link-Verifikation Zuordnung historischer Gastbestellungen derselben verifizierten E-Mail
- Vorschau und Bestätigung vor Zuordnung
- Audit-Event; keine automatische Zusammenführung nur anhand einer unbestätigten E-Mail

### Slice 5 — Termine und Selbststornierung

- Kommende/vergangene Buchungen mit Termin, Teilnehmerzahl und Status
- Selbststornierung nur bis zur pro Termin bzw. global im Admin festgelegten Frist
- Autoritativer Serverstatus; Storno, Platzfreigabe und ggf. Refund transaktional/idempotent
- Umbuchung ist zunächst nicht enthalten

### Slice 6 — Datenschutz und Admin-Support

- Datenexport, Berichtigung, Lösch-/Anonymisierungsworkflow und Aufbewahrungsregeln
- Admin-Suche und Support ohne unberechtigte Kontozusammenführung
- AuthZ-Negativtests und Audit-Historie

## Exit-Kriterien

1. Passwort und Magic Link funktionieren mit verifizierter E-Mail.
2. Kunden sehen ausschließlich eigene Bestellungen, Adressen und Termine.
3. Gastbestellungen werden nur nach nachgewiesener Identität zugeordnet.
4. Stornierungsfristen werden serverseitig geprüft; parallele Requests wirken höchstens einmal.
5. Datenschutz- und Support-Workflows sind dokumentiert, autorisiert und auditiert.

## Kritische Tests

- AuthZ: fremde Bestellung/Adresse/Buchung → 404 oder 403 ohne Datenleck
- Login-, Magic-Link- und Reset-Rate-Limits
- Gastbestellung-Zuordnung nur nach Verifikation
- Stornierung direkt vor/nach Frist und parallele Doppelstornierung
- Adressänderung verändert keine Bestell-Snapshots

## Auth-Entscheidung

Festgelegt in [ADR-0005](./adr/0005-customer-authentication.md): **Auth.js beibehalten**, Kundenidentität first-party in PostgreSQL, Magic-/Verify-/Reset-Mails über Resend. Hosted IdPs (Clerk, Descope, Auth0) sind für Slice 1 abgelehnt.
