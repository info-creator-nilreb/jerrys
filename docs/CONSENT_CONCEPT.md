# Cookie- und Consent-Konzept (jerry's)

## Kategorien

| Kategorie   | Zweck (kurz) | Standard nach „Nur notwendige“ |
|------------|--------------|--------------------------------|
| Notwendig  | Betrieb des Shops: Session, Warenkorb, Sicherheit (z. B. CSRF/Auth-technisch nötig), Speicherung der Consent-Entscheidung | immer aktiv |
| Statistik  | Reichweitenmessung (z. B. Matomo/Plausible), sobald eingebunden | Opt-in |
| Marketing  | Remarketing/Werbe-Cookies, sobald eingebunden | Opt-in |

Es werden nur Kategorien angeboten, die technisch auch genutzt werden. Aktuell können Statistik/Marketing gespeichert werden, ohne dass bereits Skripte geladen werden (Vorbereitung für Epic 7 Story 5).

## Speicherung

- **Ort:** `localStorage`, Schlüssel `jerrys_cookie_consent` (Konstante im Code).
- **Version:** Feld `v` (Zahl). Bei Änderung der Kategorien oder des Datenflusses **`CONSENT_JSON_VERSION` im Code erhöhen** → Banner erscheint erneut.
- **Kein** serverseitiges Consent-Log in V1 (optional später).

## Rechtsgrundlage (Orientierung, keine Rechtsberatung)

- Notwendig: überwiegend Vertrag/technische Speicherung (je nach Einordnung mit Rechtsbeistand).
- Statistik/Marketing: Einwilligung Art. 6 Abs. 1 lit. a DSGVO nach informierter Wahl im Banner.

## Nutzerfluss

1. Erstbesuch: Banner mit „Alle akzeptieren“, „Nur notwendige“, optional „Einstellungen“ (granular).
2. Fußzeile: **Cookie-Einstellungen** öffnet den Dialog erneut.
3. Datenschutzseite: Abschnitt zu Cookies mit Verweis auf dieses Dokument.

## Technik für spätere Skripte

- Drittanbieter nur laden, wenn `consentAllowsStatistics()` / `consentAllowsMarketing()` (Client-Helfer) `true` liefern.
- Vor Einbindung von GTM o. Ä. Epic 7 Story 5 und Datenschutz-Text anpassen.
