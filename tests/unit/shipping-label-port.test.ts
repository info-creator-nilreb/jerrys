import { describe, expect, it } from "vitest";
import { createNotConfiguredShippingLabelAdapter } from "@/features/fulfillment";

describe("NotConfiguredShippingLabelAdapter", () => {
  it("lehnt Kauf und Void klar ab", async () => {
    const port = createNotConfiguredShippingLabelAdapter();
    const buy = await port.purchaseLabel({
      shipmentId: "s1",
      orderId: "o1",
      provider: "internetmarke",
      idempotencyKey: "k1",
    });
    expect(buy).toMatchObject({ ok: false, error: "not_configured" });

    const voidRes = await port.voidLabel({
      shipmentId: "s1",
      provider: "internetmarke",
      externalRef: "ext",
      idempotencyKey: "k2",
    });
    expect(voidRes).toMatchObject({ ok: false, error: "not_configured" });
  });
});
