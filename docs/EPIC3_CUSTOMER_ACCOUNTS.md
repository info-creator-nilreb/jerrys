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

**Status:** umgesetzt. `features/customers/application/guest-order-claim.ts` findet Bestellungen mit `customerId = null` und der **verifizierten** Konto-E-Mail (Vergleich ohne Groß-/Kleinschreibung, weil Checkout-E-Mails nicht normalisiert werden). Die E-Mail stammt immer aus dem Konto, nie aus Nutzereingabe.

Ablauf: Hinweis auf `/konto` und `/konto/bestellungen` → Vorschau unter `/konto/bestellungen/zuordnen` mit Bestellnummer, Datum, Status, Betrag und Lieferort → Bestätigung. Die Server Action verlangt das Bestätigungsfeld zusätzlich serverseitig; ohne Bestätigung passiert nichts. Es gibt keine automatische Zuordnung beim Login oder Seitenaufruf.

Zuordnung je Bestellung über `updateMany` mit Bedingung `customerId: null` — dadurch idempotent und rennsicher (parallele Requests wirken höchstens einmal). Jede Zuordnung schreibt `order.customer_linked` in `order_events` und die Integrations-Outbox. Bestell-Snapshots (Adressen, Preise, Belege) bleiben unverändert.

### Slice 5 — Termine und Selbststornierung

- Kommende/vergangene Buchungen mit Termin, Teilnehmerzahl und Status
- Selbststornierung nur bis zur pro Termin bzw. global im Admin festgelegten Frist
- Autoritativer Serverstatus; Storno, Platzfreigabe und ggf. Refund transaktional/idempotent
- Umbuchung ist zunächst nicht enthalten

**Status:** umgesetzt (Kundenportal; Domänengrundlage Epic 5). Datenmodell `workshop_sessions`, `workshop_bookings`, `shop_workshop_settings` (globaler Default 48 h Selbststorno). Portal unter `/konto/termine` und Detail mit Storno bis Fristende (`features/workshops/domain/self-cancel-policy.ts`). Storno über `updateMany` mit `status = confirmed` — idempotent; `confirmed_seat_count` wird atomar dekrementiert; Audit `workshop.booking.self_cancelled` + Outbox (`refundDue` bei kostenpflichtigen Plätzen, Erstattung folgt Epic 4). Bei Konto-Löschung (Slice 6) werden bestätigte Buchungen ohne Fristprüfung storniert und Plätze freigegeben. Admin-Termine, Storefront-Kalender und Checkout-Buchung folgen in Epic 5 Slices 1–3.

### Slice 6 — Datenschutz und Admin-Support

- Datenexport, Berichtigung, Lösch-/Anonymisierungsworkflow und Aufbewahrungsregeln
- Admin-Suche und Support ohne unberechtigte Kontozusammenführung
- AuthZ-Negativtests und Audit-Historie

**Status:** umgesetzt. Portalseite `/konto/datenschutz` (nur bei bestätigter E-Mail) mit drei Bereichen:

| Recht | Umsetzung |
|---|---|
| Auskunft (Art. 15) | `GET /konto/datenschutz/export` liefert Konto, Anmeldeverfahren, Adressen und Bestellungen inkl. Positionen als JSON-Download. Kein Passwort-Hash, keine Auth-Token — beides sind Sicherheitsmerkmale, keine Auskunftsdaten. Rate-Limit pro IP. |
| Berichtigung (Art. 16) | Namensfelder im Portal; Adressen über das Adressbuch. Ein E-Mail-Wechsel erfordert erneute Verifikation und läuft deshalb über den Support. |
| Löschung (Art. 17) | `anonymizeCustomerAccount`: Bestätigungswort „LÖSCHEN“ (serverseitig geprüft), dann Entkopplung der Bestellungen, Löschung von Adressbuch, Tokens und Identitäten, Platzhalter-E-Mail, `isActive = false`, `anonymized_at`. Danach ist keine Anmeldung möglich (Passwort-Login und Magic Link prüfen `isActive`). |

**Aufbewahrung:**

| Daten | Regel |
|---|---|
| Bestellungen, Positionen, Adress-Snapshots, Belege | bleiben erhalten — handels- und steuerrechtliche Aufbewahrungspflicht (in der Regel zehn Jahre). Nach der Löschung ohne Kontoverknüpfung, nur noch in der Buchhaltung. |
| Konto, Name, Adressbuch, Anmeldeverfahren | werden bei der Löschung entfernt bzw. anonymisiert. |
| One-Time-Token (Verify, Magic Link, Reset) | TTL 60 Minuten, bei Löschung sofort entfernt. |
| `order_events` inkl. `order.customer_linked` / `order.customer_unlinked` | bleiben als Audit-Historie erhalten und enthalten keine Klardaten außer Bestellnummer und Konto-ID. |

**Entkopplung statt Konto-Ghost:** Bestellungen erhalten bei der Löschung `customerId = null`. Folge: Wer später dieselbe E-Mail-Adresse **verifiziert** besitzt, kann diese Bestellungen über Slice 4 erneut zuordnen — dieselbe Schwelle wie bei jeder Gastbestellung. Alternative wäre ein dauerhaft verknüpftes, anonymisiertes Konto; dagegen spricht, dass die Kontoentität dann weiter auf personenbezogene Snapshots zeigt.

**Admin-Support:** Die Kundenansicht im Admin gruppiert Bestellungen weiterhin nach Bestell-E-Mail. Sie zeigt jetzt zusätzlich den **Kontostatus** (kein Konto / E-Mail bestätigt / aktiv / anonymisiert, Konto seit, letzte Anmeldung, zugeordnete Bestellungen) und benennt ausdrücklich, dass die Gruppierung kein Identitätsnachweis ist. Es gibt bewusst **keine** Admin-Aktion zum Zusammenführen oder Zuordnen von Bestellungen — das geschieht ausschließlich durch die Kundin oder den Kunden nach Bestätigung.

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
