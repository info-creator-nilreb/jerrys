export const CUSTOMER_PASSWORD_MIN_LENGTH = 8;
export const CUSTOMER_PASSWORD_MAX_LENGTH = 128;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

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
  return { ok: true };
}
