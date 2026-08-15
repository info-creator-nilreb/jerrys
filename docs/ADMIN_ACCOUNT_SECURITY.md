# Admin-Konto: Passwort ändern und MFA

**Status:** umgesetzt (Slice 1 + 2, MFA optional ohne Zwang)  
**ADR:** [0011-admin-self-service-security.md](./adr/0011-admin-self-service-security.md)  
**Story:** [stories/admin-konto-passwort-mfa.md](./stories/admin-konto-passwort-mfa.md)

## Bewertung

### Problem

Heute kann ein Admin das eigene Passwort **nicht** in der UI ändern. Das Sidebar-Menü (Avatar + Adresse unten links) enthält nur **Abmelden**. MFA existiert nicht. Passwortwechsel geht nur über `npm run admin:set-password` gegen die Ziel-`DATABASE_URL`.

Das ist für den Alltag zu schwer und widerspricht dem Guardrail „MFA-capable admin authentication“ in [QUALITY_GUARDRAILS.md](./QUALITY_GUARDRAILS.md). Für einen Boutique-Shop mit wenigen Admins und Auth.js-Credentials ist Self-Service plus TOTP der passende nächste Schritt — kein IdP-Wechsel (ADR-0005).

### Was bereits passt

| Baustein | Wiederverwenden |
| --- | --- |
| Sidebar-User-Menü | `components/admin/admin-sidebar.tsx` — Avatar und Adresse sind bereits ein Button (`aria-expanded`) |
| Admin-Session | `getAdminSession()` prüft `subjectKind === "admin"` |
| Kunden-Passwortwechsel | `changeCustomerPassword` + Server Action + Rate-Limit + Kriterien-UI |
| Passwort-Policy | 10 Zeichen, Groß/Klein/Ziffer (`features/customers/domain/password.ts`) |
| Unsichere Defaults | `isInsecureAdminPassword` (`change-me-now`) |
| Login-Rate-Limit | `lib/security/sign-in-rate-limit.ts` |
| Audit | `appendIntegrationOutbox` (`admin_user.password_changed`, `admin_user.mfa_*`) |
| Secret-Verschlüsselung | AES-GCM-Muster der Integrations-Keys |

### UX-Entscheidung: Seite statt Modal

Sicherheitsflows (aktuelles Passwort, QR-Code, Recovery-Codes) gehören **nicht** in ein Sidebar-Popover. Klick auf Avatar **oder** Adresse navigiert nach `/admin/konto`. Das Popover bekommt denselben Link plus Abmelden.

`/admin/einstellungen` bleibt Shop-Branding. Personenkonto und Shop-Konfiguration nicht mischen.

## Zielbild

```text
Sidebar unten
  [Avatar]  Name
            Administrator / E-Mail
            └─ Klick Avatar oder Text → /admin/konto
            └─ Popover: Konto · Abmelden

/admin/konto
  Karte „Passwort“     aktuelles + neu + Bestätigung
  Karte „Zwei-Faktor“  inaktiv → Setup / aktiv → Disable + Codes neu
```

Login mit aktivem MFA:

1. E-Mail + Passwort (unverändert, `signIn("credentials")`).
2. Bei `mfaEnabled`: Redirect `/admin/login/mfa` (kurzlebiger, HttpOnly Challenge-Cookie, kein volles Admin-JWT).
3. TOTP oder Recovery-Code → erst dann Session mit `mfaVerifiedAt`.

## Slices

### Slice 1 — Konto-Seite und Passwort

- Route `/admin/konto` im Dashboard-Layout (bestehende Admin-Session).
- Sidebar: Menüpunkt „Konto“; Avatar- und Adressklick öffnen die Seite.
- Server Action `changeAdminPasswordAction`: Session-User, aktuelles Passwort, Policy, Rate-Limit, bcrypt, Outbox `admin_user.password_changed`.
- Empfohlen in derselben Lieferung: `credentialsChangedAt` auf `AdminUser`; JWT-Callback lehnt Tokens ab, die älter sind als dieser Zeitstempel (sonst bleiben alte Sessions 8 h gültig).
- CLI `admin:set-password` bleibt und setzt `credentialsChangedAt`.

### Slice 2 — TOTP MFA

- Schema: `mfaEnabled`, verschlüsseltes `mfaSecret`, `mfaEnabledAt`, `credentialsChangedAt`; Tabelle `admin_mfa_recovery_codes` (Hash, `consumedAt`).
- Setup: Secret erzeugen → QR + manuelles Secret einmalig → Bestätigungscode → Recovery-Codes einmalig anzeigen.
- Login-Zweitfaktor wie oben.
- Disable nur mit aktuellem Passwort + gültigem TOTP (oder Recovery).
- Rate-Limit für Setup-Confirm, Login-TOTP und Recovery getrennt von Passwort-Login.
- Optional: Hinweisbanner „MFA ist aus“, kein Hard-Block.

### Slice 3 — später, nicht in diesem Vorschlag

- MFA-Pflicht für Production.
- Mehrere Admins, Rollen, Least Privilege.
- Admin-Passwort-Reset per E-Mail.
- Passkeys, Kunden-MFA, WebAuthn.
- Geräte-/Session-Liste (JWT hat keine serverseitige Session-Tabelle).

## Datenmodell (Slice 2, expand/contract)

```prisma
model AdminUser {
  // bestehend …
  credentialsChangedAt DateTime? @map("credentials_changed_at")
  mfaEnabled           Boolean   @default(false) @map("mfa_enabled")
  mfaSecretEnc         String?   @map("mfa_secret_enc") // AES-GCM, nie Klartext
  mfaEnabledAt         DateTime? @map("mfa_enabled_at")
  recoveryCodes        AdminMfaRecoveryCode[]
}

model AdminMfaRecoveryCode {
  id          String    @id @default(cuid())
  adminUserId String    @map("admin_user_id")
  adminUser   AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)
  codeHash    String    @map("code_hash")
  consumedAt  DateTime? @map("consumed_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([adminUserId])
  @@map("admin_mfa_recovery_codes")
}
```

Pending-Secrets während des Setups **nicht** dauerhaft auf `AdminUser` schreiben. Kurzlebiges, serverseitig signiertes Cookie oder verschlüsseltes Setup-Token (TTL ~10 min) bis Confirm.

## Sicherheitsregeln

- Nur `getAdminSession().user.id`; keine Client-IDs.
- TOTP-Secret und Recovery-Codes: verschlüsselt bzw. gehasht; Anzeige nur einmal.
- Gleiche Fehlertexte bei falschem aktuellem Passwort / TOTP (kein User-Enumeration über das Konto — User ist schon eingeloggt; am Login weiter generisch bleiben).
- Recovery-Code: einmalig, transaktional `consumedAt`, Audit `admin_user.mfa_recovery_used`.
- Keine Secrets in Logs, Analytics, Outbox-Payloads (nur `adminUserId`, Event-Typ, Timestamp).
- CSP: QR als SVG/Data-URL oder `qrcode` auf dem Server als Inline-SVG — keine neue Remote-Script-Quelle.

## UI (Design System)

- Eine dominante Primäraktion pro Karte (Passwort speichern / MFA aktivieren).
- Primärgrün, Lucide (`KeyRound`, `ShieldCheck`, `ShieldOff`, `Copy`).
- Zustände: leer (MFA aus), pending, Erfolg (Server-Truth), Fehler, disabled während Submit, schmale Sidebar/Mobile.
- Recovery-Codes: Copy + Hinweis „jetzt sichern“; nach Navigation nicht wieder einsehbar.
- Konto-Seite **nicht** unter Einstellungen-Kinder hängen (andere IA: Person vs. Shop).

## Tests

**Unit:** Policy, Change-Password (falsches aktuell, gleiches neu, insecure default), TOTP verify/window, Recovery consume einmalig, JWT-Reject nach `credentialsChangedAt`.

**Integration:** Server Actions ohne Session → Redirect/401; fremde ID unmöglich; Rate-Limit; Outbox-Events.

**E2E:** Login → Avatar → `/admin/konto` → Passwort ändern → Re-Login. MFA: Setup → Logout → Login + TOTP. Negativ: falscher TOTP bleibt ohne Session.

**Security:** kein Secret im HTML nach Enrollment; Recovery-Hashes nicht im Client.

## Ops / Rollback

- Slice 1: nur Code + bestehende Tabelle; Rollback = Code revert.
- Slice 2: additive Migration; Rollback = MFA-Felder ignorieren, Login ohne Zweitfaktor wenn `mfaEnabled = false`.
- Lockout: `npm run admin:set-password` setzt Passwort und sollte MFA serverseitig deaktivieren können (`--disable-mfa`) — im Runbook dokumentieren.
- Feature-Flag unnötig für Slice 1; Slice 2 kann hinter `ADMIN_MFA_ENABLED` (Env, Default an in Production) liegen, falls Enrollment gestaffelt werden soll.

## Abhängigkeiten / Risiken

| Risiko | Mitigation |
| --- | --- |
| Auth.js Credentials kennt keinen nativen 2. Faktor | Challenge-Cookie + eigene MFA-Seite, JWT erst danach |
| Alte JWTs nach Passwortwechsel | `credentialsChangedAt` im jwt-Callback |
| In-Memory-Rate-Limit auf Vercel | bekannt; gleiches Muster wie Login; Missbrauch begrenzt durch Session + bcrypt |
| QR-Lib / OTP-Lib neu | kleine, gepflegte Pakete (`otpauth` + serverseitiges QR); keine Client-Secrets |
| Einziger Admin verliert Gerät | Recovery-Codes + CLI `--disable-mfa` |
