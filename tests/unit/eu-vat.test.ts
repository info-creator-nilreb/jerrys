import { describe, expect, it } from "vitest";
import { vatAppliesForShippingCountry } from "@/lib/tax/eu-vat";

describe("vatAppliesForShippingCountry", () => {
  it("EU-27 inkl. Deutschland", () => {
    expect(vatAppliesForShippingCountry("DE")).toBe(true);
    expect(vatAppliesForShippingCountry("at")).toBe(true);
  });

  it("Drittland ohne USt.-Ausweis im Shop", () => {
    expect(vatAppliesForShippingCountry("CH")).toBe(false);
    expect(vatAppliesForShippingCountry("US")).toBe(false);
    expect(vatAppliesForShippingCountry("GB")).toBe(false);
  });
});
