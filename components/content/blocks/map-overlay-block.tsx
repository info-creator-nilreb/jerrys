import { MapOverlayCard } from "@/components/content/blocks/map-overlay-card";
import { OsmStaticMapCanvas } from "@/components/content/blocks/osm-static-map-canvas";
import {
  LOCATION_MAP_VIEWPORT,
  MAP_OVERLAY_SPAN_METERS,
  mapOverlayHasCard,
  mapOverlayHeadingId,
  mapOverlayPinSlot,
  resolveMapOverlayCtaHref,
  type MapOverlayBlockData,
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

export async function MapOverlayBlock({
  data,
  blockId,
}: {
  data: MapOverlayBlockData;
  blockId: string;
}) {
  const coords = await resolveMapOverlayCoords(data);
  const layout = coords
    ? buildOsmCenteredTileLayout({
        lat: coords.lat,
        lon: coords.lon,
        viewportWidth: LOCATION_MAP_VIEWPORT.width,
        viewportHeight: LOCATION_MAP_VIEWPORT.height,
        halfWidthM: MAP_OVERLAY_SPAN_METERS[data.mapSpan],
      })
    : null;
  const hasCard = mapOverlayHasCard(data);
  const pinSlot = mapOverlayPinSlot(hasCard, data.overlayPosition);
  const ctaHref = resolveMapOverlayCtaHref(data, coords);
  const labelledBy = data.headline ? mapOverlayHeadingId(blockId) : undefined;
  const overlayOnRight = data.overlayPosition === "right";

  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : (data.query ?? "Standortkarte")}
      className="relative w-full overflow-hidden bg-neutral-200 md:min-h-[28rem] lg:min-h-[32rem]"
    >
      <div className="relative min-h-[18rem] md:absolute md:inset-0 md:min-h-0">
        {layout ? (
          <OsmStaticMapCanvas
            layout={layout}
            grayscale={data.grayscale}
            pinSlot={pinSlot}
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-200" aria-hidden />
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
        ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="pointer-events-auto text-neutral-700 underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>
      </p>
    </section>
  );
}
