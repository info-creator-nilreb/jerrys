import { describe, expect, it } from "vitest";
import { parseCommerceMaintenanceMode } from "@/lib/commerce/maintenance-mode";

describe("parseCommerceMaintenanceMode", () => {
  it("erkennt critical case-insensitive", () => {
    expect(parseCommerceMaintenanceMode("critical")).toBe("critical");
    expect(parseCommerceMaintenanceMode(" Critical ")).toBe("critical");
  });

  it("defaultet auf full bei fehlendem oder unbekanntem Wert", () => {
    expect(parseCommerceMaintenanceMode(undefined)).toBe("full");
    expect(parseCommerceMaintenanceMode(null)).toBe("full");
    expect(parseCommerceMaintenanceMode("")).toBe("full");
    expect(parseCommerceMaintenanceMode("full")).toBe("full");
    expect(parseCommerceMaintenanceMode("turbo")).toBe("full");
  });
});
