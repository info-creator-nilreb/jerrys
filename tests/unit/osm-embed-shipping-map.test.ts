import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOsmEmbedShippingMapUrl } from "@/lib/maps/osm-embed-shipping-map-url";
import { buildOsmExternalShippingMapUrl } from "@/lib/maps/osm-external-shipping-map-url";
import {
  buildOsmTileUrl,
  buildShippingMapTileLayout,
  shippingMapZoomForSpan,
  SHIPPING_MAP_VIEWPORT,
} from "@/lib/maps/osm-tile-shipping-map-layout";

describe("buildOsmEmbedShippingMapUrl", () => {
  it("zeigt den OSM-Embed um die Koordinate, ohne OSM-Marker", () => {
    const src = buildOsmEmbedShippingMapUrl(52.52, 13.405);
    const url = new URL(src);
    expect(url.origin).toBe("https://www.openstreetmap.org");
    expect(url.pathname).toBe("/export/embed.html");
    expect(url.searchParams.get("layer")).toBe("mapnik");
    expect(url.searchParams.get("marker")).toBeNull();
  });
});

describe("buildShippingMapTileLayout", () => {
  it("liefert Kacheln ohne Embed-UI um Berlin", () => {
    const layout = buildShippingMapTileLayout(52.52, 13.405);
    expect(layout.zoom).toBeGreaterThan(10);
    expect(layout.tiles.length).toBeGreaterThan(0);
    expect(layout.tileColumns * layout.tileRows).toBe(layout.tiles.length);
    expect(buildOsmTileUrl(layout.zoom, layout.tiles[0]!.x, layout.tiles[0]!.y)).toMatch(
      /^https:\/\/tile\.openstreetmap\.org\//,
    );
  });

  it("skaliert Zoom mit Breiten-Spanne", () => {
    const wide = shippingMapZoomForSpan(52.52, SHIPPING_MAP_VIEWPORT.halfWidthM, 960);
    const tight = shippingMapZoomForSpan(52.52, 200, 960);
    expect(tight).toBeGreaterThan(wide);
  });
});

describe("buildOsmExternalShippingMapUrl", () => {
  it("verlinkt auf interaktive OSM-Karte mit Marker", () => {
    const href = buildOsmExternalShippingMapUrl(52.52, 13.405);
    expect(href).toContain("mlat=52.52");
    expect(href).toContain("mlon=13.405");
    expect(href).toContain("#map=16/52.52/13.405");
  });
});

describe("OrderShippingMapSnippet", () => {
  it("nutzt statische OSM-Kacheln ohne iframe und Link zur interaktiven Karte", () => {
    const src = readFileSync(path.resolve("components/storefront/order-shipping-map-snippet.tsx"), "utf8");
    expect(src).toContain("buildShippingMapTileLayout");
    expect(src).toContain("buildOsmExternalShippingMapUrl");
    expect(src).not.toContain("<iframe");
    expect(src).toContain("buildOsmTileUrl");
    expect(src).toContain("OpenStreetMap-Mitwirkende");
    expect(src).toContain("Interaktive Karte öffnen");
  });
});

describe("ClearCheckoutDraftsOnSuccess", () => {
  it("aktualisiert den Header nach erfolgreicher Bestellung", () => {
    const src = readFileSync(
      path.resolve("components/storefront/clear-checkout-drafts-on-success.tsx"),
      "utf8",
    );
    expect(src).toContain("router.refresh()");
  });
});
