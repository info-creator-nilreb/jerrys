import { describe, expect, it } from "vitest";
import { buildCarrierTrackingUrl } from "@/lib/shipping/carrier-tracking";

describe("buildCarrierTrackingUrl", () => {
  it("liefert URL mit encodierter Sendungsnummer", () => {
    const u = buildCarrierTrackingUrl("DHL", "1234567890");
    expect(u).toContain("piececode=");
    expect(u).toContain(encodeURIComponent("1234567890"));
  });

  it("leer bei fehlender Nummer", () => {
    expect(buildCarrierTrackingUrl("DPD", "   ")).toBeNull();
  });
});
