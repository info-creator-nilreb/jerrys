/**
 * JWT helpers for Zettle API keys (assertion grant).
 * The API key is a JWT; `client_id` lives in the payload (`iss` or `aud`/`client_id` depending on key).
 */

export type ZettleApiKeyClaims = {
  clientId: string;
  raw: Record<string, unknown>;
};

function decodeBase64UrlJson(segment: string): Record<string, unknown> {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const json = Buffer.from(padded + pad, "base64").toString("utf8");
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Ungültiges JWT-Payload.");
  }
  return parsed as Record<string, unknown>;
}

/**
 * Extrahiert `client_id` aus einem Zettle-API-Key (JWT Assertion).
 * Laut Zettle-Docs: client_id aus dem JWT lesen; oft als `iss` oder explizites `client_id`.
 */
export function parseZettleApiKeyClaims(apiKey: string): ZettleApiKeyClaims {
  const trimmed = apiKey.trim();
  const parts = trimmed.split(".");
  if (parts.length < 2 || !parts[1]) {
    throw new Error("API-Key muss ein JWT sein (drei Segmente, Base64url).");
  }
  let payload: Record<string, unknown>;
  try {
    payload = decodeBase64UrlJson(parts[1]);
  } catch {
    throw new Error("API-Key-JWT konnte nicht dekodiert werden.");
  }

  const clientIdCandidate =
    (typeof payload.client_id === "string" && payload.client_id) ||
    (typeof payload.cid === "string" && payload.cid) ||
    (typeof payload.iss === "string" && payload.iss) ||
    (typeof payload.sub === "string" && payload.sub) ||
    "";

  const clientId = clientIdCandidate.trim();
  if (!clientId) {
    throw new Error(
      "Im API-Key fehlt die client_id (JWT-Claims client_id / iss). Bitte Key in my.zettle.com neu erzeugen.",
    );
  }

  return { clientId, raw: payload };
}
