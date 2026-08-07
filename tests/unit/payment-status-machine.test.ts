import { describe, expect, it } from "vitest";
import { isAllowedPaymentStatusTransition, isTerminalPaymentStatus } from "@/features/orders";

describe("payment-status-machine", () => {
  it("markiert succeeded als terminal für offene Zahlungsversuche", () => {
    expect(isTerminalPaymentStatus("succeeded")).toBe(true);
    expect(isTerminalPaymentStatus("pending")).toBe(false);
  });

  it("erlaubt pending → succeeded und succeeded → refunded", () => {
    expect(isAllowedPaymentStatusTransition("pending", "succeeded")).toBe(true);
    expect(isAllowedPaymentStatusTransition("succeeded", "refunded")).toBe(true);
    expect(isAllowedPaymentStatusTransition("failed", "succeeded")).toBe(false);
  });
});
