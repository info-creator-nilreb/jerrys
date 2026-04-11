import { describe, expect, it } from "vitest";
import { orderPaymentStatusLabel } from "@/lib/orders/order-payment-label";

describe("orderPaymentStatusLabel", () => {
  it("übersetzt bekannte Status", () => {
    expect(orderPaymentStatusLabel("succeeded")).toBe("Erfolgreich");
    expect(orderPaymentStatusLabel("pending")).toBe("Ausstehend");
  });

  it("gibt unbekannte Werte zurück", () => {
    expect(orderPaymentStatusLabel("custom")).toBe("custom");
  });
});
