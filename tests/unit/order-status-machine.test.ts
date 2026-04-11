import { describe, expect, it } from "vitest";
import {
  allowedNextOrderStatuses,
  isAllowedOrderStatusTransition,
  isTerminalOrderStatus,
} from "@/lib/orders/order-status-machine";

describe("order-status-machine", () => {
  it("erlaubt bestaetigt → processing und storniert", () => {
    expect(allowedNextOrderStatuses("bestaetigt")).toEqual(["processing", "cancelled"]);
    expect(isAllowedOrderStatusTransition("bestaetigt", "processing")).toBe(true);
    expect(isAllowedOrderStatusTransition("bestaetigt", "shipped")).toBe(false);
  });

  it("erlaubt processing → shipped", () => {
    expect(isAllowedOrderStatusTransition("processing", "shipped")).toBe(true);
    expect(isAllowedOrderStatusTransition("processing", "completed")).toBe(false);
  });

  it("erlaubt shipped → completed", () => {
    expect(isAllowedOrderStatusTransition("shipped", "completed")).toBe(true);
  });

  it("verbietet gleichen Status", () => {
    expect(isAllowedOrderStatusTransition("bestaetigt", "bestaetigt")).toBe(false);
  });

  it("terminal completed → nur refunded", () => {
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(allowedNextOrderStatuses("completed")).toEqual(["refunded"]);
  });

  it("terminal cancelled ohne Folge", () => {
    expect(allowedNextOrderStatuses("cancelled")).toEqual([]);
  });

  it("unbekannter Status: keine Kanten", () => {
    expect(allowedNextOrderStatuses("does_not_exist")).toEqual([]);
  });
});
