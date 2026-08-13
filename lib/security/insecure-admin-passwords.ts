/** Bekannte unsichere Seed-/Default-Passwörter — in Production nie akzeptieren. */
export const INSECURE_ADMIN_PASSWORDS = new Set(["change-me-now"]);

export function isInsecureAdminPassword(password: string): boolean {
  return INSECURE_ADMIN_PASSWORDS.has(password);
}
