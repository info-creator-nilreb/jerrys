import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOsmEmbedShippingMapUrl } from "@/lib/maps/osm-embed-shipping-map-url";
import { buildOsmExternalShippingMapUrl } from "@/lib/maps/osm-external-shipping-map-url";

describe("buildOsmEmbedShippingMapUrl", () => {
  it("zeigt den OSM-Embed um die Koordinate, ohne OSM-Marker", () => {
    const src = buildOsmEmbedShippingMapUrl(52.52, 13.405);
    const url = new URL(src);
    expect(url.origin).toBe("https://www.openstreetmap.org");
    expect(url.pathname).toBe("/export/embed.html");
    expect(url.searchParams.get("layer")).toBe("mapnik");
    expect(url.searchParams.get("marker")).toBeNull();
    const bbox = url.searchParams.get("bbox")?.split(",").map(Number) ?? [];
    expect(bbox).toHaveLength(4);
    expect(bbox[0]!).toBeLessThan(13.405);
    expect(bbox[2]!).toBeGreaterThan(13.405);
    expect(bbox[1]!).toBeLessThan(52.52);
    expect(bbox[3]!).toBeGreaterThan(52.52);
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
  it("nutzt statisches OSM-Embed ohne Panning und Link zur interaktiven Karte", () => {
    const src = readFileSync(path.resolve("components/storefront/order-shipping-map-snippet.tsx"), "utf8");
    expect(src).toContain("buildOsmEmbedShippingMapUrl");
    expect(src).toContain("buildOsmExternalShippingMapUrl");
    expect(src).toContain("<iframe");
    expect(src).toContain("pointer-events-none");
    expect(src).toContain('referrerPolicy="strict-origin-when-cross-origin"');
    expect(src).not.toContain('referrerPolicy="no-referrer"');
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
