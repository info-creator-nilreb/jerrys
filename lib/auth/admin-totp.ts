import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SEC = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[\s-]/g, "");
  if (!cleaned) throw new Error("Leeres TOTP-Secret.");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("Ungültiges TOTP-Secret.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const otp = bin % 10 ** digits;
  return String(otp).padStart(digits, "0");
}

export function generateTotp(secretBase32: string, nowMs = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SEC);
  return hotp(decodeBase32(secretBase32), counter);
}

export function normalizeTotpInput(code: string): string {
  return code.replace(/\s/g, "");
}

export function verifyTotp(
  secretBase32: string,
  code: string,
  nowMs = Date.now(),
  window = TOTP_WINDOW,
): boolean {
  const normalized = normalizeTotpInput(code);
  if (!/^\d{6}$/.test(normalized)) return false;
  let secret: Buffer;
  try {
    secret = decodeBase32(secretBase32);
  } catch {
    return false;
  }
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SEC);
  const provided = Buffer.from(normalized);
  for (let i = -window; i <= window; i++) {
    const expected = Buffer.from(hotp(secret, counter + i));
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
      return true;
    }
  }
  return false;
}

export function buildOtpauthUrl(params: {
  issuer: string;
  account: string;
  secret: string;
}): string {
  const issuer = params.issuer.trim() || "Admin";
  const account = params.account.trim() || "admin";
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const q = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SEC),
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}
