# ADR-0011: Admin self-service password change and TOTP MFA

- Status: Accepted
- Date: 2026-08-15
- Owners: Engineering
- Epic: 9 (Hardening) / Admin-Konto

## Context

Der Admin-Login ist Auth.js Credentials + JWT (`subjectKind: admin`, Session 8 h). `AdminUser` speichert nur E-Mail, `passwordHash`, Rolle und Aktiv-Flag. Passwortänderungen laufen ausschließlich über das CLI-Skript `npm run admin:set-password`. Das Avatar-Menü unten links in der Sidebar bietet nur **Abmelden**.

[QUALITY_GUARDRAILS.md](../QUALITY_GUARDRAILS.md) verlangt MFA-fähige Admin-Authentifizierung, bevor die Produktionsadministration weiter ausgebaut wird. [ADR-0005](./0005-customer-authentication.md) hat MFA für Kunden bewusst zurückgestellt und Auth.js plus First-Party-Identität gewählt — kein gehostetes IdP.

Bedarf: eingeloggte Admins sollen über Klick auf Avatar **oder** angezeigte Adresse ihr Passwort ändern und MFA aktivieren können.

## Options considered

1. **Gehostetes IdP (Clerk / Auth0 / Descope)** — MFA-UI fertig, aber neuer Subprocessor, DPA, zweiter Identity-Store, bricht ADR-0005.
2. **WebAuthn/Passkeys zuerst** — stark, aber höherer Aufwand (Attestation, Recovery, Browser-Matrix) und kein bestehendes Muster im Repo.
3. **First-party TOTP (Authenticator-App) + Self-Service-Passwort unter `/admin/konto`** — analog zum Kunden-Passwortwechsel (`changeCustomerPassword`), bleibt in Postgres, keine neuen Provider.

## Decision

Option 3.

1. **Einstieg:** Avatar und Adresse im Sidebar-User-Menü öffnen `/admin/konto` (kein Modal für sicherheitskritische Flows). Zusätzlich Menüpunkt „Konto“ neben „Abmelden“.
2. **Konto-Seite** mit zwei Karten: Passwort ändern, Zwei-Faktor-Authentifizierung. Shop-Einstellungen bleiben unter `/admin/einstellungen` (Shop-Branding, nicht Personenkonto).
3. **Passwort:** aktuelles Passwort + neues + Bestätigung; Policy mindestens so streng wie Kundenpasswort (10 Zeichen, Groß/Klein/Ziffer) plus Ablehnung bekannter Seed-Defaults (`isInsecureAdminPassword`). Server Action, Rate-Limit, Audit-Outbox. CLI bleibt Recovery-Pfad.
4. **MFA:** TOTP (RFC 6238), Secret verschlüsselt (AES-GCM wie Integrations-Keys), Aktivierung erst nach verifiziertem Code, Recovery-Codes gehasht. Login: nach gültigem Passwort zweiter Schritt mit TOTP oder Recovery-Code. JWT erhält `mfaVerifiedAt` nur nach vollständigem Login.
5. **Kein neues Bounded Context** in v1: Application-Logik unter `lib/auth/` (bestehender Admin-Auth-Ort). Extraktion nach `features/admin` nur, wenn weitere Admin-Identitätsfälle dazukommen.
6. **Kein MFA-Zwang in Slice 1.** Slice 2 kann Enforcement (Enrollment-Banner, später Pflicht) nachziehen. Kunden-MFA bleibt out of scope.

## Consequences

Positive:

- Schließt die Lücke zwischen Guardrail und heutiger CLI-only-Praxis.
- Wiederverwendet Auth.js, Zod, Server Actions, bcrypt, Outbox, Rate-Limit.
- Kein neuer Subprocessor.

Negative / accepted trade-offs:

- Login wird zweistufig (Passwort → TOTP); Auth.js Credentials bleibt first factor.
- JWT-Sessions können nach Passwort-/MFA-Änderung nicht serverseitig invalidiert werden; Mitigation: kurze Session (bereits 8 h) plus optionales `credentialsChangedAt` im Token-Check (Slice 1b, empfohlen).
- Recovery ohne Gerät bleibt CLI + Recovery-Codes; kein E-Mail-Reset für Admins in Slice 1 (Login-Link „Passwort vergessen?“ bleibt bewusst inaktiv).

## Guardrails

- Secrets, TOTP-Seeds und Recovery-Codes nie loggen, nie im Client nach Enrollment anzeigen.
- QR/Secret nur einmal während Setup; danach nur Status „aktiv“ / „nicht aktiv“.
- Authorization: nur die eigene `AdminUser.id` aus `getAdminSession()`; keine ID aus dem Client.
- MFA-Disable und Recovery-Code-Verbrauch erfordern aktuelles Passwort bzw. gültigen Code und werden auditiert.
- Cross-module: Kunden-Passwort-Policy darf importiert werden (`@/features/customers` public / `features/customers/password`), Admin-Logik darf Kunden-Internals nicht anfassen.

## Revisit when

- Mehrere Admins mit Rollen/Least-Privilege eingeführt werden (dann MFA-Pflicht + Admin-User-Verwaltung).
- Passkeys oder ein gehostetes IdP Compliance-Anforderung werden.
- Admin- und Kunden-Session im selben Browser koexistieren müssen.
