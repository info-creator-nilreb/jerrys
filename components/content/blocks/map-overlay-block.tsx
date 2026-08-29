import { MapOverlayCard } from "@/components/content/blocks/map-overlay-card";
import { MapBasemapAttribution } from "@/components/maps/map-basemap-attribution";
import { OsmStaticMapCanvas } from "@/components/maps/osm-static-map-canvas";
import {
  LOCATION_MAP_VIEWPORT,
  LOCATION_MAP_VIEWPORT_MOBILE,
  MAP_OVERLAY_PIN_X_RATIO,
  MAP_OVERLAY_SPAN_METERS,
  mapOverlayHasCard,
  mapOverlayHeadingId,
  mapOverlayPinSlot,
  resolveMapOverlayCtaHref,
  type MapOverlayBlockData,
  type MapOverlayPinSlot,
} from "@/lib/content/blocks/map-overlay";
import { geocodePlaceQuery } from "@/lib/maps/geocode-place-query";
import { buildOsmCenteredTileLayout } from "@/lib/maps/osm-tile-shipping-map-layout";

async function resolveMapOverlayCoords(
  data: MapOverlayBlockData,
): Promise<{ lat: number; lon: number } | null> {
  if (data.lat != null && data.lon != null) {
    return { lat: data.lat, lon: data.lon };
  }
  if (data.query) return geocodePlaceQuery(data.query);
  return null;
}

function overlayTileLayout(
  coords: { lat: number; lon: number },
  mapSpan: MapOverlayBlockData["mapSpan"],
  pinSlot: MapOverlayPinSlot,
  viewport: { width: number; height: number },
) {
  return buildOsmCenteredTileLayout({
    lat: coords.lat,
    lon: coords.lon,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    halfWidthM: MAP_OVERLAY_SPAN_METERS[mapSpan],
    pinXRatio: MAP_OVERLAY_PIN_X_RATIO[pinSlot],
  });
}

export async function MapOverlayBlock({
  data,
  blockId,
}: {
  data: MapOverlayBlockData;
  blockId: string;
}) {
  const coords = await resolveMapOverlayCoords(data);
  const hasCard = mapOverlayHasCard(data);
  const pinSlot = mapOverlayPinSlot(hasCard, data.overlayPosition);
  const layoutDesktop = coords
    ? overlayTileLayout(coords, data.mapSpan, pinSlot, LOCATION_MAP_VIEWPORT)
    : null;
  const layoutMobile = coords
    ? overlayTileLayout(coords, data.mapSpan, "center", LOCATION_MAP_VIEWPORT_MOBILE)
    : null;
  const ctaHref = resolveMapOverlayCtaHref(data, coords);
  const labelledBy = data.headline ? mapOverlayHeadingId(blockId) : undefined;
  const overlayOnRight = data.overlayPosition === "right";
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : (data.query ?? "Standortkarte")}
      className="relative w-full overflow-hidden bg-neutral-100 md:min-h-[28rem] lg:min-h-[32rem]"
    >
      <div className="relative aspect-[5/4] md:absolute md:inset-0 md:aspect-auto">
        {layoutMobile && layoutDesktop ? (
          <>
            <div className="absolute inset-0 md:hidden">
              <OsmStaticMapCanvas layout={layoutMobile} grayscale={data.grayscale} />
            </div>
            <div className="absolute inset-0 hidden md:block">
              <OsmStaticMapCanvas layout={layoutDesktop} grayscale={data.grayscale} />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-neutral-100" aria-hidden />
        )}
      </div>

      {hasCard ? (
        <div
          className={`relative z-10 px-4 py-6 md:absolute md:inset-0 md:flex md:min-h-[28rem] md:items-center md:px-10 md:py-10 lg:min-h-[32rem] lg:px-16 ${
            overlayOnRight ? "md:justify-end" : "md:justify-start"
          }`}
        >
          <MapOverlayCard data={data} ctaHref={ctaHref} headingId={labelledBy} />
        </div>
      ) : (
        <span className="sr-only">{data.query ?? "Standortkarte"}</span>
      )}

      <p className="pointer-events-none absolute right-3 bottom-2 z-20 text-[10px] text-neutral-600/80">
        <MapBasemapAttribution
          prefix=""
          linkClassName="pointer-events-auto text-neutral-700 underline-offset-2 hover:underline"
        />
      </p>
    </section>
  );
}
