import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_RAW_LENGTH = 10;
export const ADMIN_MFA_RECOVERY_CODE_COUNT = 8;

export function generateAdminMfaRecoveryCodes(
  count = ADMIN_MFA_RECOVERY_CODE_COUNT,
): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    const bytes = randomBytes(RECOVERY_RAW_LENGTH);
    for (let j = 0; j < RECOVERY_RAW_LENGTH; j++) {
      raw += RECOVERY_ALPHABET[bytes[j]! % RECOVERY_ALPHABET.length];
    }
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function normalizeAdminMfaRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashAdminMfaRecoveryCode(code: string): string {
  const normalized = normalizeAdminMfaRecoveryCode(code);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function recoveryCodeHashesEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}
