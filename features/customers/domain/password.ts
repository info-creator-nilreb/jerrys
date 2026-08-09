export const CUSTOMER_PASSWORD_MIN_LENGTH = 10;
export const CUSTOMER_PASSWORD_MAX_LENGTH = 128;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/** Kurztext für Formular-Hilfe (Storefront). */
export const CUSTOMER_PASSWORD_REQUIREMENTS_HINT =
  "Mindestens 10 Zeichen, je ein Groß- und Kleinbuchstabe sowie eine Ziffer.";

/**
 * OWASP-taugliche Mindestanforderungen für Kundenpasswörter (ohne MFA):
 * Länge + Zeichenvielfalt, keine extrem kurzen oder nur-Buchstaben-Passwörter.
 */
export function validateCustomerPassword(password: string): PasswordValidationResult {
  if (password.length < CUSTOMER_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Das Passwort muss mindestens ${CUSTOMER_PASSWORD_MIN_LENGTH} Zeichen haben.`,
    };
  }
  if (password.length > CUSTOMER_PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `Das Passwort darf höchstens ${CUSTOMER_PASSWORD_MAX_LENGTH} Zeichen haben.`,
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens einen Kleinbuchstaben enthalten.",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens einen Großbuchstaben enthalten.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens eine Ziffer enthalten.",
    };
  }
  return { ok: true };
}
