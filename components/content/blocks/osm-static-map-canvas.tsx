import { MapPin } from "lucide-react";
import {
  buildOsmTileUrl,
  type ShippingMapTileLayout,
} from "@/lib/maps/osm-tile-shipping-map-layout";

export function OsmStaticMapCanvas({
  layout,
  grayscale = true,
  showMarker = true,
}: {
  layout: ShippingMapTileLayout;
  grayscale?: boolean;
  showMarker?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-200" aria-hidden>
      <div
        className={grayscale ? "absolute grayscale contrast-[1.03]" : "absolute"}
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
          // OSM-Kacheln: kein next/image (Tile-Nutzungsbedingungen, gleiches Muster wie Lieferkarte).
          // eslint-disable-next-line @next/next/no-img-element -- OSM-Tiles, analog OrderShippingMapSnippet
          <img
            key={`${layout.zoom}-${tile.x}-${tile.y}`}
            src={buildOsmTileUrl(layout.zoom, tile.x, tile.y)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="block h-full w-full object-cover"
          />
        ))}
      </div>
      {showMarker ? (
        <MapPin
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-14 -translate-x-1/2 -translate-y-full text-primary drop-shadow-md"
          fill="currentColor"
          stroke="white"
          strokeWidth={1.5}
        />
      ) : null}
    </div>
  );
}
