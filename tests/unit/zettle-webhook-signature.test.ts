import { describe, expect, it } from "vitest";
import { verifyZettleWebhookSignature } from "@/features/inventory/infrastructure/zettle-webhook-signature";
import { generateUuidV1 } from "@/features/inventory/infrastructure/zettle-uuid-v1";
import { createHmac } from "node:crypto";

describe("verifyZettleWebhookSignature", () => {
  it("akzeptiert gültige HMAC-Signatur", () => {
    const signingKey = "test-signing-key";
    const timestamp = "2021-04-19T13:15:37.904+0000";
    const payload = '{"purchaseUUID1":"abc"}';
    const signature = createHmac("sha256", signingKey)
      .update(`${timestamp}.${payload}`, "utf8")
      .digest("hex");
    expect(
      verifyZettleWebhookSignature({
        signingKey,
        timestamp,
        payload,
        signatureHeader: signature,
      }),
    ).toBe(true);
  });

  it("lehnt falsche Signatur ab", () => {
    expect(
      verifyZettleWebhookSignature({
        signingKey: "key",
        timestamp: "t",
        payload: "p",
        signatureHeader: "deadbeef",
      }),
    ).toBe(false);
  });
});

describe("generateUuidV1", () => {
  it("liefert Version-1-UUID", () => {
    const id = generateUuidV1();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
