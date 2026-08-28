import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import { defaultDataForContentBlockType } from "@/lib/content/block-defaults";
import {
  LOCATION_MAP_VIEWPORT,
  mapOverlayHasCard,
  mapOverlaySearchUrl,
  resolveMapOverlayCtaHref,
  type MapOverlayBlockData,
} from "@/lib/content/blocks/map-overlay";
import { buildNominatimPlaceQueryUrl } from "@/lib/maps/geocode-place-query";
import {
  buildOsmCenteredTileLayout,
  buildShippingMapTileLayout,
} from "@/lib/maps/osm-tile-shipping-map-layout";

describe("mapOverlay schema", () => {
  it("parst Defaults aus dem Admin", () => {
    const r = parseContentBlockData("mapOverlay", defaultDataForContentBlockType("mapOverlay"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        query: "Stargarder Str. 16, 10437 Berlin, Deutschland",
        grayscale: true,
        overlayPosition: "left",
        mapSpan: "neighborhood",
        headline: "Lass dich vor Ort inspirieren",
      });
    }
  });

  it("erlaubt Koordinaten ohne Adress-Query", () => {
    const r = parseContentBlockData("mapOverlay", {
      lat: 52.54,
      lon: 13.42,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const data = r.data as MapOverlayBlockData;
      expect(data.lat).toBe(52.54);
      expect(data.lon).toBe(13.42);
      expect(data.query).toBeNull();
      expect(data.grayscale).toBe(true);
    }
  });

  it("lehnt Block ohne Adresse und ohne Koordinaten ab", () => {
    expect(parseContentBlockData("mapOverlay", { headline: "Nur Text" }).ok).toBe(false);
  });

  it("lehnt unsichere CTA-URLs ab und erlaubt HTTPS oder Pfad", () => {
    expect(
      parseContentBlockData("mapOverlay", {
        query: "Berlin",
        ctaHref: "javascript:alert(1)",
      }).ok,
    ).toBe(false);
    expect(
      parseContentBlockData("mapOverlay", {
        query: "Berlin",
        ctaHref: "https://www.openstreetmap.org/",
      }).ok,
    ).toBe(true);
    expect(
      parseContentBlockData("mapOverlay", {
        query: "Berlin",
        ctaHref: "/kontakt",
      }).ok,
    ).toBe(true);
  });

  it("leert Overlay-Felder zu null", () => {
    const r = parseContentBlockData("mapOverlay", {
      query: "Berlin",
      headline: "  ",
      address: "",
      hours: "",
      ctaLabel: "",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(mapOverlayHasCard(r.data as MapOverlayBlockData)).toBe(false);
    }
  });
});

describe("resolveMapOverlayCtaHref", () => {
  it("nutzt gesetztes Ziel zuerst", () => {
    expect(
      resolveMapOverlayCtaHref(
        { ctaLabel: "Weg", ctaHref: "/kontakt", query: "Berlin" },
        { lat: 52.5, lon: 13.4 },
      ),
    ).toBe("/kontakt");
  });

  it("fällt auf OSM-Marker und sonst Suche zurück", () => {
    expect(
      resolveMapOverlayCtaHref(
        { ctaLabel: "Weg", ctaHref: null, query: "Berlin" },
        { lat: 52.52, lon: 13.405 },
      ),
    ).toContain("openstreetmap.org/?mlat=52.52");
    expect(
      resolveMapOverlayCtaHref({ ctaLabel: "Weg", ctaHref: null, query: "Berlin" }, null),
    ).toBe(mapOverlaySearchUrl("Berlin"));
    expect(
      resolveMapOverlayCtaHref({ ctaLabel: null, ctaHref: null, query: "Berlin" }, null),
    ).toBeNull();
  });
});

describe("geocode place query URL", () => {
  it("sucht per Nominatim-Freitext", () => {
    const url = new URL(buildNominatimPlaceQueryUrl("Stargarder Str. 16, Berlin"));
    expect(url.origin).toBe("https://nominatim.openstreetmap.org");
    expect(url.searchParams.get("q")).toBe("Stargarder Str. 16, Berlin");
    expect(url.searchParams.get("limit")).toBe("1");
  });
});

describe("location map tile layout", () => {
  it("entspricht dem Lieferkarten-Layout bei gleichen Maßen", () => {
    const a = buildShippingMapTileLayout(52.52, 13.405);
    const b = buildOsmCenteredTileLayout({
      lat: 52.52,
      lon: 13.405,
      viewportWidth: 960,
      viewportHeight: 600,
      halfWidthM: 620,
    });
    expect(b).toEqual(a);
  });

  it("nutzt den Standort-Viewport", () => {
    expect(LOCATION_MAP_VIEWPORT).toEqual({ width: 1600, height: 560 });
    const layout = buildOsmCenteredTileLayout({
      lat: 52.54,
      lon: 13.42,
      viewportWidth: LOCATION_MAP_VIEWPORT.width,
      viewportHeight: LOCATION_MAP_VIEWPORT.height,
      halfWidthM: 900,
    });
    expect(layout.tiles.length).toBeGreaterThan(0);
  });
});

describe("MapOverlayBlock", () => {
  it("rendert OSM-Kacheln ohne iframe und ohne Google Maps", () => {
    const src = readFileSync(
      path.resolve("components/content/blocks/map-overlay-block.tsx"),
      "utf8",
    );
    expect(src).toContain("OsmStaticMapCanvas");
    expect(src).not.toContain("<iframe");
    expect(src).not.toContain("google.com/maps");
    expect(src).toContain("OpenStreetMap");
  });
});
