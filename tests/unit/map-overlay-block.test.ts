import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapCanvasCoverFrameStyle } from "@/components/maps/osm-static-map-canvas";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import { defaultDataForContentBlockType } from "@/lib/content/block-defaults";
import {
  LOCATION_MAP_VIEWPORT,
  LOCATION_MAP_VIEWPORT_MOBILE,
  MAP_OVERLAY_PIN_X_RATIO,
  MAP_OVERLAY_SPAN_METERS,
  mapOverlayHasCard,
  mapOverlayPinSlot,
  mapOverlaySearchUrl,
  resolveMapOverlayCtaHref,
  type MapOverlayBlockData,
} from "@/lib/content/blocks/map-overlay";
import { buildNominatimPlaceQueryUrl, pickNominatimPlaceHit } from "@/lib/maps/geocode-place-query";
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
    expect(url.searchParams.get("limit")).toBe("5");
  });
});

describe("pickNominatimPlaceHit", () => {
  it("bevorzugt Hauskoordinaten vor POIs an derselben Adresse", () => {
    const coords = pickNominatimPlaceHit([
      {
        lat: "52.5461465",
        lon: "13.4187201",
        addresstype: "shop",
        class: "shop",
      },
      {
        lat: "52.5461270",
        lon: "13.4187871",
        addresstype: "place",
        class: "place",
      },
    ]);
    expect(coords).toEqual({ lat: 52.546127, lon: 13.4187871 });
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
    expect(layout.pinXPct).toBe(50);
    expect(layout.pinYPct).toBe(50);
  });

  it("nutzt ein Mobil-Viewport im gleichen Verhältnis wie aspect-[5/4]", () => {
    expect(LOCATION_MAP_VIEWPORT_MOBILE).toEqual({ width: 800, height: 640 });
    expect(LOCATION_MAP_VIEWPORT_MOBILE.width / LOCATION_MAP_VIEWPORT_MOBILE.height).toBeCloseTo(
      5 / 4,
      5,
    );
  });

  it("zoomt das Viertel näher heran als der frühere Weitwinkel", () => {
    expect(MAP_OVERLAY_SPAN_METERS.near).toBe(280);
    expect(MAP_OVERLAY_SPAN_METERS.neighborhood).toBe(550);
    expect(MAP_OVERLAY_SPAN_METERS.city).toBe(1400);
    expect(MAP_OVERLAY_SPAN_METERS.near).toBeLessThan(MAP_OVERLAY_SPAN_METERS.neighborhood);
    expect(MAP_OVERLAY_SPAN_METERS.neighborhood).toBeLessThan(MAP_OVERLAY_SPAN_METERS.city);
  });

  it("verschiebt den Ausschnitt, damit die Geokoordinate neben dem Overlay liegt", () => {
    const lat = 52.546127;
    const lon = 13.4187871;
    const pinXRatio = MAP_OVERLAY_PIN_X_RATIO["map-right"];
    const layout = buildOsmCenteredTileLayout({
      lat,
      lon,
      viewportWidth: LOCATION_MAP_VIEWPORT.width,
      viewportHeight: LOCATION_MAP_VIEWPORT.height,
      halfWidthM: 1500,
      pinXRatio,
    });
    expect(layout.pinXPct).toBeCloseTo(pinXRatio * 100);

    const tileSize = 256;
    const scale = tileSize * 2 ** layout.zoom;
    const x = ((lon + 180) / 360) * scale;
    const left = x - layout.viewportWidth * pinXRatio;
    const startTileX = Math.floor(left / tileSize);
    const geoX =
      (startTileX * tileSize - left + (x - startTileX * tileSize)) / layout.viewportWidth;
    expect(geoX * 100).toBeCloseTo(layout.pinXPct, 5);
  });
});

describe("mapOverlayPinSlot", () => {
  it("legt den Pin neben das Overlay, sonst in die Mitte", () => {
    expect(mapOverlayPinSlot(false, "left")).toBe("center");
    expect(mapOverlayPinSlot(false, "right")).toBe("center");
    expect(mapOverlayPinSlot(true, "left")).toBe("map-right");
    expect(mapOverlayPinSlot(true, "right")).toBe("map-left");
  });
});

describe("MapOverlayBlock", () => {
  it("rendert OSM-Kacheln ohne iframe und ohne Google Maps", () => {
    const src = readFileSync(
      path.resolve("components/content/blocks/map-overlay-block.tsx"),
      "utf8",
    );
    expect(src).toContain("OsmStaticMapCanvas");
    expect(src).toContain("MAP_OVERLAY_PIN_X_RATIO");
    expect(src).toContain("LOCATION_MAP_VIEWPORT_MOBILE");
    expect(src).toContain("aspect-[5/4]");
    expect(src).not.toContain("w-[140%]");
    expect(src).not.toContain("<iframe");
    expect(src).not.toContain("google.com/maps");
    expect(src).toContain("MapBasemapAttribution");
  });

  it("nutzt durchsichtigeres Overlay", () => {
    const src = readFileSync(
      path.resolve("components/content/blocks/map-overlay-card.tsx"),
      "utf8",
    );
    expect(src).toContain("bg-white/85");
    expect(src).not.toContain("bg-white/95");
  });

  it("legt den Pin auf die Layout-Koordinate ohne die Karte zu strecken", () => {
    const src = readFileSync(
      path.resolve("components/maps/osm-static-map-canvas.tsx"),
      "utf8",
    );
    expect(src).toContain("layout.pinXPct");
    expect(src).toContain("buildMutedMapTileUrl");
    expect(src).toContain("bg-white/20");
    expect(src).toContain("[container-type:size]");
    expect(src).toContain("mapCanvasCoverFrameStyle");
    expect(src).not.toContain("w-[140%]");
    expect(src).not.toContain("from \"lucide-react\"");
  });

  it("skaliert den Kartenrahmen deckend ohne das Kachelverhältnis zu ändern", () => {
    const layout = buildOsmCenteredTileLayout({
      lat: 52.54,
      lon: 13.42,
      viewportWidth: LOCATION_MAP_VIEWPORT_MOBILE.width,
      viewportHeight: LOCATION_MAP_VIEWPORT_MOBILE.height,
      halfWidthM: 1500,
    });
    const style = mapCanvasCoverFrameStyle(layout);
    expect(style.aspectRatio).toBe("800 / 640");
    expect(String(style.width)).toContain("100cqw");
    expect(String(style.height)).toContain("100cqh");
  });
});
