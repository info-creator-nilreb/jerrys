import { describe, expect, it } from "vitest";
import {
  DEFAULT_PICKUP_READY_HOURS,
  formatPickupReadyText,
  formatPickupStoreAddress,
  googleMapsUrlForPickupStore,
  resolvePickupDisplayCopy,
  resolvePickupStoreHref,
  type PickupStoreRecord,
} from "@/lib/shop/pickup-store-shared";

const sampleStore: PickupStoreRecord = {
  id: "store-1",
  name: "jerry's Store Berlin",
  line1: "Linienstraße 40",
  line2: null,
  zip: "10119",
  city: "Berlin",
  country: "DE",
  infoUrl: null,
  isActive: true,
  sortOrder: 0,
};

describe("pickup-stores", () => {
  it("formatiert Adresse und Google-Maps-URL", () => {
    expect(formatPickupStoreAddress(sampleStore)).toBe(
      "Linienstraße 40, 10119 Berlin, DE",
    );
    expect(googleMapsUrlForPickupStore(sampleStore)).toContain(
      encodeURIComponent("Linienstraße 40, 10119 Berlin, DE"),
    );
  });

  it("nutzt Info-Link für Store-Href, sonst Maps", () => {
    expect(resolvePickupStoreHref(sampleStore)).toContain("google.com/maps");
    expect(
      resolvePickupStoreHref({ ...sampleStore, infoUrl: "/kontakt" }),
    ).toBe("/kontakt");
  });

  it("formatiert Fertigstellungs-Hinweis aus Stunden", () => {
    expect(formatPickupReadyText(24)).toBe("Gewöhnlich fertig in 24 Stunden");
    expect(formatPickupReadyText(48)).toBe("Gewöhnlich fertig in 2 Tagen");
  });

  it("resolvePickupDisplayCopy nutzt Default 24h", () => {
    const copy = resolvePickupDisplayCopy(sampleStore, null);
    expect(copy.store.name).toBe("jerry's Store Berlin");
    expect(copy.readyText).toBe(formatPickupReadyText(DEFAULT_PICKUP_READY_HOURS));
    expect(copy.formattedAddress).toContain("Berlin");
  });
});
