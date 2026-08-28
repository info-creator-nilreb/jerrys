import { MapLocationPin } from "@/components/maps/map-location-pin";
import {
  buildMutedMapTileUrl,
  MUTED_MAP_FILTER_CLASS,
  type ShippingMapTileLayout,
} from "@/lib/maps/osm-tile-shipping-map-layout";

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
    <div className="absolute inset-0 overflow-hidden bg-neutral-100" aria-hidden>
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
          // eslint-disable-next-line @next/next/no-img-element -- CARTO/OSM-Tiles
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
      {showMarker ? (
        <MapLocationPin
          className={pinClassName}
          style={{ left: `${layout.pinXPct}%`, top: `${layout.pinYPct}%` }}
        />
      ) : null}
    </div>
  );
}
