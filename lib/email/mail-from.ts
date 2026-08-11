/**
 * Bereitet MAIL_FROM für die Resend-API auf.
 * @see https://resend.com/docs/api-reference/emails/send-email
 * Erlaubt: `email@example.com` oder `Name <email@example.com>` (Name ohne Anführungszeichen).
 */

const DEFAULT_DISPLAY_NAME = "Jerrys";

const RFC2047_Q = /^=\?UTF-8\?Q\?(.+)\?=$/i;

export type MailFromResolveSource = "mail_from_email" | "mail_from" | "none";

export type MailFromResolveResult = {
  from: string | null;
  source: MailFromResolveSource;
};

function normalizeEnvValue(value: string): string {
  return value
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019`´]/g, "'")
    .replace(/\r?\n/g, "")
    .trim();
}

function decodeRfc2047QuotedPrintable(encoded: string): string {
  return encoded
    .replace(/_/g, " ")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
}

function decodeDisplayName(name: string): string {
  let trimmed = name.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1);
  }
  const m = trimmed.match(RFC2047_Q);
  if (m?.[1]) return decodeRfc2047QuotedPrintable(m[1]);
  return trimmed;
}

/** Resend-kompatibler Anzeigename: ASCII, keine Quotes/Apostrophe im Output. */
export function resendSafeDisplayName(raw: string | undefined): string {
  const decoded = decodeDisplayName(raw?.trim() ?? "");
  const ascii = decoded
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (ascii.length >= 1 && ascii.length <= 64) {
    return ascii
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
  return DEFAULT_DISPLAY_NAME;
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function extractEmailAddress(value: string): string | null {
  const bracket = value.match(/<([^<>]+)>/);
  const candidate = bracket?.[1]?.trim() ?? value.trim();
  return EMAIL_RE.test(candidate) ? candidate : null;
}

function formatResendFrom(email: string, displayRaw?: string): string {
  const display = displayRaw?.trim()
    ? resendSafeDisplayName(displayRaw)
    : DEFAULT_DISPLAY_NAME;
  return `${display} <${email}>`;
}

function stripOuterQuotes(value: string): string {
  let v = value.trim();
  while (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/** Erzwingt gültiges Resend-Format; bei Zweifel nur die nackte E-Mail-Adresse. */
export function coerceResendFromFormat(from: string): string | null {
  const trimmed = from.trim();
  if (EMAIL_RE.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(.+?)\s*<([^<>]+)>$/);
  if (!match) return null;
  const email = match[2]?.trim();
  if (!email || !EMAIL_RE.test(email)) return null;
  return formatResendFrom(email, match[1]?.trim());
}

/**
 * @returns Absender-String für Resend oder null bei ungültiger Konfiguration
 */
export function resolveMailFromForResend(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const value = stripOuterQuotes(normalizeEnvValue(trimmed).replace(/\\"/g, '"'));
  const email = extractEmailAddress(value);
  if (!email) return null;

  const bracketIndex = value.indexOf("<");
  const displayPart = bracketIndex > 0 ? value.slice(0, bracketIndex).trim() : "";

  if (!displayPart) {
    return email;
  }

  return formatResendFrom(email, displayPart);
}

/**
 * Bevorzugt getrennte Vercel-Variablen (ohne Parsing-Probleme), sonst `MAIL_FROM`.
 * `displayNameFallback` (z. B. ShopSettings.emailFromName) nur wenn kein Env-Name gesetzt.
 */
export function resolveTransactionalMailFrom(
  env?: {
    MAIL_FROM?: string;
    MAIL_FROM_EMAIL?: string;
    MAIL_FROM_NAME?: string;
  },
  options?: { displayNameFallback?: string | null },
): MailFromResolveResult {
  const e = env ?? process.env;
  const emailSplit = e.MAIL_FROM_EMAIL?.trim();
  if (emailSplit && EMAIL_RE.test(emailSplit)) {
    const nameSplit = e.MAIL_FROM_NAME?.trim() || options?.displayNameFallback?.trim();
    const from = coerceResendFromFormat(
      nameSplit ? formatResendFrom(emailSplit, nameSplit) : emailSplit,
    );
    return { from, source: "mail_from_email" };
  }

  const parsed = resolveMailFromForResend(e.MAIL_FROM);
  if (!parsed) {
    return { from: null, source: "none" };
  }
  const coerced = coerceResendFromFormat(parsed);
  if (!coerced) {
    return { from: null, source: "none" };
  }
  /** Nur nackte E-Mail → optional Anzeigename aus Settings ergänzen. */
  if (
    EMAIL_RE.test(coerced) &&
    options?.displayNameFallback?.trim() &&
    !e.MAIL_FROM_NAME?.trim()
  ) {
    const withName = coerceResendFromFormat(
      formatResendFrom(coerced, options.displayNameFallback.trim()),
    );
    return { from: withName ?? coerced, source: "mail_from" };
  }
  return { from: coerced, source: "mail_from" };
}

export type ResendErrorBody = {
  message?: string;
  name?: string;
  statusCode?: number;
};

export function parseResendErrorBody(json: unknown, httpStatus: number): string {
  if (json && typeof json === "object") {
    const body = json as ResendErrorBody;
    const parts = [body.message, body.name ? `(${body.name})` : null].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  return `${httpStatus}`;
}
