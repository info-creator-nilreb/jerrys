import { describe, expect, it } from "vitest";
import { isOrderEmailAlreadySentSuccessfully } from "@/lib/email/order-email-log";

describe("order-email-log (Epic 5 Dedupe)", () => {
  it("überspringt nur bei erfolgreichem Versand", () => {
    expect(isOrderEmailAlreadySentSuccessfully({ status: "sent" })).toBe(true);
    expect(isOrderEmailAlreadySentSuccessfully({ status: "failed" })).toBe(false);
    expect(isOrderEmailAlreadySentSuccessfully({ status: "skipped_no_provider" })).toBe(false);
    expect(isOrderEmailAlreadySentSuccessfully(null)).toBe(false);
  });
});
