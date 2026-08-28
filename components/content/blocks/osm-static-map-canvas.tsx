import { MapPin } from "lucide-react";
import type { MapOverlayPinSlot } from "@/lib/content/blocks/map-overlay";
import {
  buildOsmTileUrl,
  type ShippingMapTileLayout,
} from "@/lib/maps/osm-tile-shipping-map-layout";

const PIN_SLOT_CANVAS_CLASS: Record<MapOverlayPinSlot, string> = {
  center: "absolute inset-0",
  /** Mobil: Pin mittig über der gestapelten Karte. Desktop: Pin rechts neben dem Overlay. */
  "map-right": "absolute inset-0 md:left-0 md:w-[140%] md:right-auto",
  /** Mobil mittig, Desktop links neben rechtem Overlay. */
  "map-left": "absolute inset-0 md:left-[-40%] md:w-[140%] md:right-auto",
};

export function OsmStaticMapCanvas({
  layout,
  grayscale = true,
  showMarker = true,
  pinSlot = "center",
}: {
  layout: ShippingMapTileLayout;
  grayscale?: boolean;
  showMarker?: boolean;
  pinSlot?: MapOverlayPinSlot;
}) {
  return (
    <div className={`${PIN_SLOT_CANVAS_CLASS[pinSlot]} overflow-hidden bg-neutral-200`} aria-hidden>
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
