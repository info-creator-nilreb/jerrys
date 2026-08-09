/**
 * Bereitet MAIL_FROM für die Resend-API auf.
 * Resend erwartet `Name <email@domain>` (UTF-8 oder quoted display name), kein RFC2047 encoded-word.
 */

const RFC2047_Q = /^=\?UTF-8\?Q\?(.+)\?=$/i;

function decodeRfc2047QuotedPrintable(encoded: string): string {
  return encoded
    .replace(/_/g, " ")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
}

function decodeDisplayName(name: string): string {
  const trimmed = name.trim().replace(/^"|"$/g, "");
  const m = trimmed.match(RFC2047_Q);
  if (m?.[1]) return decodeRfc2047QuotedPrintable(m[1]);
  return trimmed;
}

function needsQuotedDisplayName(name: string): boolean {
  return /[\u0080-\uFFFF'"]/.test(name) || /^\s|\s$/.test(name);
}

function formatDisplayName(name: string): string {
  const decoded = decodeDisplayName(name);
  if (!decoded) return "jerry's";
  if (needsQuotedDisplayName(decoded)) {
    return `"${decoded.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return decoded;
}

/**
 * @returns Absender-String für Resend oder null bei ungültiger Konfiguration
 */
export function resolveMailFromForResend(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const value = trimmed.replace(/\\"/g, '"');
  const bracket = value.match(/<([^>]+)>/);
  const email = bracket?.[1]?.trim();
  const displayPart = bracket ? value.slice(0, bracket.index).trim() : "";

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const display = displayPart ? formatDisplayName(displayPart) : "jerry's";
    return `${display} <${email}>`;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `${formatDisplayName("jerry's")} <${value}>`;
  }

  return value;
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
