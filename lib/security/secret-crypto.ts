import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";
/** AES-GCM Auth-Tag-Länge in Bytes (Semgrep: gcm-no-tag-length). */
const AUTH_TAG_LENGTH = 16;

function resolveKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY muss 32 Bytes sein (Base64) oder 64 Hex-Zeichen.",
    );
  }
  const auth = process.env.AUTH_SECRET?.trim();
  if (!auth) {
    throw new Error(
      "Weder INTEGRATIONS_ENCRYPTION_KEY noch AUTH_SECRET für Secret-Crypto gesetzt.",
    );
  }
  return createHash("sha256").update(`jerrys-integrations-v1:${auth}`).digest();
}

/** AES-256-GCM; Ausgabe `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function encryptSecret(plaintext: string): string {
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Unerwartete Auth-Tag-Länge beim Verschlüsseln.");
  }
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Ungültiges Secret-Format.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = resolveKey();
  const iv = Buffer.from(ivB64!, "base64url");
  const tag = Buffer.from(tagB64!, "base64url");
  if (tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Ungültige Auth-Tag-Länge.");
  }
  const data = Buffer.from(dataB64!, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
