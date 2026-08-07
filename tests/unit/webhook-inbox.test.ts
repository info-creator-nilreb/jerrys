import { describe, expect, it, vi } from "vitest";
import { beginWebhookInboxProcessing } from "@/features/integrations";

describe("webhook inbox", () => {
  it("meldet Duplikate mit alreadyProcessed", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValue({});
    const findUnique = vi.fn().mockResolvedValue({ id: "in-1", status: "processed" });
    const db = { webhookInboxEntry: { create, findUnique } };

    const r = await beginWebhookInboxProcessing(db as never, {
      provider: "paypal",
      externalEventId: "capture:ABC",
    });

    expect(r.ok).toBe(true);
    if (r.ok && r.duplicate) {
      expect(r.alreadyProcessed).toBe(true);
      expect(r.entryId).toBe("in-1");
    }
  });
});
