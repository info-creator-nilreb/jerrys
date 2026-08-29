import type { CSSProperties } from "react";
import { MapLocationPin } from "@/components/maps/map-location-pin";
import {
  buildMutedMapTileUrl,
  MUTED_MAP_FILTER_CLASS,
  type ShippingMapTileLayout,
} from "@/lib/maps/osm-tile-shipping-map-layout";

/** Deckend, unverzerrt: Kacheln behalten das Layout-Seitenverhältnis (object-fit: cover). */
export function mapCanvasCoverFrameStyle(layout: ShippingMapTileLayout): CSSProperties {
  const aspect = layout.viewportWidth / layout.viewportHeight;
  return {
    aspectRatio: `${layout.viewportWidth} / ${layout.viewportHeight}`,
    width: `max(100cqw, ${aspect} * 100cqh)`,
    height: `max(100cqh, ${1 / aspect} * 100cqw)`,
  };
}

export function OsmStaticMapCanvas({
  layout,
  grayscale = true,
  showMarker = true,
  pinClassName,
}: {
  layout: ShippingMapTileLayout;
  grayscale?: boolean;
  showMarker?: boolean;
  pinClassName?: string;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-neutral-100 [container-type:size]"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={mapCanvasCoverFrameStyle(layout)}
      >
        <div
          className={grayscale ? `absolute ${MUTED_MAP_FILTER_CLASS}` : "absolute"}
          style={{
            left: `${layout.gridLeftPct}%`,
            top: `${layout.gridTopPct}%`,
            width: `${layout.gridWidthPct}%`,
            height: `${layout.gridHeightPct}%`,
            display: "grid",
            gridTemplateColumns: `repeat(${layout.tileColumns}, 1fr)`,
            gridTemplateRows: `repeat(${layout.tileRows}, 1fr)`,
          }}
        >
          {layout.tiles.map((tile) => (
            // Rasterkacheln: kein next/image (Tile-Nutzungsbedingungen).
            // eslint-disable-next-line @next/next/no-img-element -- OSM-Tiles
            <img
              key={`${layout.zoom}-${tile.x}-${tile.y}`}
              src={buildMutedMapTileUrl(layout.zoom, tile.x, tile.y)}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block h-full w-full"
            />
          ))}
        </div>
        {grayscale ? (
          <div className="pointer-events-none absolute inset-0 bg-white/20" />
        ) : null}
        {showMarker ? (
          <MapLocationPin
            className={pinClassName}
            style={{ left: `${layout.pinXPct}%`, top: `${layout.pinYPct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
