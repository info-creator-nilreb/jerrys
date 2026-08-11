import { describe, expect, it } from "vitest";
import {
  isAllowedShipmentTransition,
  isTerminalShipmentStatus,
  shipmentStatusLabel,
} from "@/features/fulfillment";

describe("shipment-status-machine", () => {
  it("erlaubt typische Happy-Path-Kanten", () => {
    expect(isAllowedShipmentTransition("draft", "labeled")).toBe(true);
    expect(isAllowedShipmentTransition("draft", "shipped")).toBe(true);
    expect(isAllowedShipmentTransition("labeled", "shipped")).toBe(true);
    expect(isAllowedShipmentTransition("shipped", "delivered")).toBe(true);
  });

  it("verbietet Rückwärts- und Terminal-Kanten", () => {
    expect(isAllowedShipmentTransition("shipped", "draft")).toBe(false);
    expect(isAllowedShipmentTransition("voided", "shipped")).toBe(false);
    expect(isAllowedShipmentTransition("delivered", "shipped")).toBe(false);
    expect(isAllowedShipmentTransition("draft", "draft")).toBe(false);
  });

  it("kennzeichnet Terminale und Labels", () => {
    expect(isTerminalShipmentStatus("voided")).toBe(true);
    expect(isTerminalShipmentStatus("draft")).toBe(false);
    expect(shipmentStatusLabel("labeled")).toBe("Label erstellt");
  });
});
