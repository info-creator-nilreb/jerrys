import { describe, expect, it } from "vitest";
import {
  formatWorkshopSessionLocationBlock,
  hasWorkshopSessionStreetAddress,
  workshopSessionMapsSearchUrl,
} from "@/lib/workshop/workshop-location";

describe("workshop location", () => {
  it("formatiert Adresszeilen", () => {
    const block = formatWorkshopSessionLocationBlock({
      locationLabel: "Werkstatt",
      locationLine1: "Hauptstraße 5",
      locationLine2: "2. OG",
      locationZip: "80331",
      locationCity: "München",
      locationCountry: "DE",
    });
    expect(block.headline).toBe("Werkstatt");
    expect(block.addressLines).toEqual(["Hauptstraße 5", "2. OG", "80331 München"]);
  });

  it("liefert Maps-URL bei vollständiger Adresse", () => {
    expect(
      hasWorkshopSessionStreetAddress({
        locationLine1: "A",
        locationZip: "1",
        locationCity: "B",
      }),
    ).toBe(true);
    const url = workshopSessionMapsSearchUrl({
      locationLabel: "X",
      locationLine1: "Hauptstraße 1",
      locationZip: "10115",
      locationCity: "Berlin",
      locationCountry: "DE",
    });
    expect(url).toContain("google.com/maps/search");
  });
});
