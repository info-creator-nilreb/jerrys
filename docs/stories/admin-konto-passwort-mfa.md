# Story Title

Admin kann eigenes Passwort ändern und TOTP-MFA aktivieren

## Goal

Als Admin möchte ich über den Avatar oder die Adresse unten links im Admin mein Passwort ändern und MFA aktivieren, damit ich das Konto ohne CLI pflegen und den Zugang härten kann.

## Scope

- Einstieg: Klick auf Avatar **oder** Adresse im Sidebar-User-Menü → `/admin/konto`; Popover-Eintrag „Konto“
- Self-Service Passwort ändern (aktuelles + neu + Bestätigung)
- TOTP-MFA aktivieren, bestätigen, deaktivieren; Recovery-Codes
- Login-Zweitfaktor nach Passwort, wenn MFA aktiv
- Audit-Outbox, Rate-Limits, `credentialsChangedAt` gegen alte JWTs
- CLI bleibt Recovery (`admin:set-password`, MFA-Disable)

## Out of Scope

- MFA-Pflicht / Enrollment-Zwang in Production
- Admin-Passwort-Reset per E-Mail (Login-Link bleibt inaktiv)
- Mehrere Admins, Rollen, Least-Privilege-UI
- Passkeys, WebAuthn, Kunden-MFA
- Session-/Geräteliste
- Shop-Einstellungen umbauen

## Relevant Documents

- AGENT.md
- REQUIREMENTS.md
- ARCHITECTURE.md
- PLATFORM_ROADMAP.md (Epic 9 Hardening)
- QUALITY_GUARDRAILS.md
- DESIGN_SYSTEM.md
- OPERATIONS.md
- TEST_STRATEGY.md
- adr/0005-customer-authentication.md
- adr/0011-admin-self-service-security.md
- ADMIN_ACCOUNT_SECURITY.md

## Impacted Areas

- routes/pages: `/admin/konto`, `/admin/login`, `/admin/login/mfa`
- features: keine neue Modulgrenze in v1; Logik in `lib/auth/`
- domain entities: `AdminUser`, `AdminMfaRecoveryCode`
- database tables: `admin_users` (additive Felder), `admin_mfa_recovery_codes`
- UI: `admin-sidebar.tsx` User-Menü
- tests: Unit/Integration/E2E wie in ADMIN_ACCOUNT_SECURITY.md
- docs: SECURITY_SURFACE.md, OPERATIONS.md, ADR-Index

## Acceptance Criteria

1. Klick auf Avatar oder auf Name/E-Mail unten links öffnet `/admin/konto` (nicht nur das Abmelden-Menü).
2. Auf `/admin/konto` kann der eingeloggte Admin das Passwort ändern; Erfolg nur nach Serverbestätigung; Formular leert Passwortfelder.
3. Neues Passwort erfüllt die Kunden-Policy, unterscheidet sich vom aktuellen und ist kein Seed-Default.
4. Falsches aktuelles Passwort wird abgewiesen, ohne den Hash oder interne Fehler zu leaken; Rate-Limit greift.
5. Ohne MFA bleibt der Login unverändert (E-Mail + Passwort → Admin-Session).
6. MFA-Setup zeigt QR und Secret einmalig; Aktivierung erst nach korrektem TOTP; danach Recovery-Codes einmalig.
7. Mit aktivem MFA erzeugt gültiges Passwort allein keine Admin-Session; erst TOTP oder unbenutzter Recovery-Code.
8. Deaktivieren von MFA erfordert aktuelles Passwort und gültigen zweiten Faktor; Serverzustand ist maßgeblich.
9. Passwort- oder MFA-Änderung schreibt ein Outbox-Event ohne Secrets und invalidiert ältere JWTs über `credentialsChangedAt`.
10. Unauthentifizierte Requests auf Konto-Actions werden abgewiesen; nur das eigene Konto ist veränderbar.

## Technical Notes

- validation: Zod analog `customerChangePasswordSchema`; TOTP 6 Ziffern; Recovery-Format festlegen (z. B. 8×10 alphanumerisch).
- authorization: `getAdminSession()` in jeder Action; Login-MFA-Seite nur mit gültigem Challenge-Cookie.
- state machine: MFA `off` → `pending_setup` (Cookie) → `on`; Disable `on` → `off` (Secret + Codes löschen).
- logging: `admin_password_changed`, `admin_mfa_enabled`, `admin_mfa_disabled`, `admin_mfa_challenge_failed` — keine Codes.
- idempotency: Recovery-Consume transaktional; Disable/Enable nicht doppelt Secrets ausgeben.
- module API: `lib/auth` bleibt Owner; Kundenmodul nur über öffentliche Passwort-Policy.
- migration: expand/contract; neue Spalten nullable bzw. Default `false`.

## Privacy and Security

- personal data, purpose, legal basis, and retention: Admin-E-Mail und Auth-Metadaten für Vertrag/Betrieb; TOTP-Secret verschlüsselt; Recovery-Hashes; kein Klartext nach Setup.
- trust boundaries and abuse cases: gestohlene Session ohne MFA-Change-Schutz (aktuelles Passwort verlangen); Brute-Force TOTP (Rate-Limit + Lockout-Logging); Recovery-Code-Diebstahl (einmalig, Audit).
- audit and authorization requirements: Outbox `admin_user.*`; nur eigener User.

## Operations and Performance

- metrics, logs, alerts: fehlgeschlagene MFA-Challenges, Password-Change-Rate, Lockout über CLI-Runbook.
- provider timeout/retry: keines (kein externer IdP).
- caching: Konto-Seite `force-dynamic`; keine öffentliche Cache.
- feature flag and rollback: Slice 1 ohne Flag; Slice 2 optional `ADMIN_MFA_ENABLED`; CLI `--disable-mfa`.

## Storefront / Admin UX

- primary action and information hierarchy: eine Primäraktion pro Karte; Konto nicht unter Shop-Einstellungen.
- empty, pending, success, failure, and disabled states: MFA-aus erklärt den Nutzen; Pending am Button; Erfolg nur nach Server.
- keyboard, mobile, zoom, and long-text behavior: Sidebar-Drawer, 44px Targets, Recovery-Liste umbrechbar.
- authoritative server-state feedback: kein optimistisches „MFA aktiv“ vor Confirm.

## Edge Cases

- Sidebar eingeklappt: nur Avatar sichtbar — Klick muss trotzdem `/admin/konto` bzw. Menü mit Konto öffnen.
- MFA-Setup abgebrochen: Pending-Cookie läuft ab, `mfaEnabled` bleibt false.
- Gleichzeitiges Setup in zwei Tabs: Confirm gilt für das Secret im Cookie; zweites Tab schlägt fehl.
- JWT ohne `mfaVerifiedAt` bei `mfaEnabled`: Zugang zu `/admin/*` außer Login/MFA verweigern.
- Seed-Admin in Production: unsichere Passwörter weiter ablehnen.

## Tests

### Unit

- `changeAdminPassword`: Erfolg, falsches aktuell, gleiches neu, insecure, inaktiv
- TOTP Fenster ±1, ungültiger Code
- Recovery einmalig verbraucht
- JWT älter als `credentialsChangedAt` ungültig

### Integration

- Actions ohne Admin-Session
- Outbox-Events ohne Secret-Felder
- Login ohne MFA unverändert; mit MFA Challenge nötig

### E2E

- Avatar → Konto → Passwort ändern
- MFA enroll → Logout → Login + TOTP
- falscher TOTP: keine Session

### Contract / Security / Load

- SECURITY_SURFACE.md ergänzen
- Semgrep: keine Secrets in Client-Bundles

## Definition of Done

- implementation complete
- tests added/updated
- docs updated if required
- lint/typecheck/tests pass
- architecture check passes
- privacy, security, observability, migration, and rollback addressed
