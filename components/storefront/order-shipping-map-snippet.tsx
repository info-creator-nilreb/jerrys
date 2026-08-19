import { geocodeShippingAddress } from "@/lib/maps/geocode-shipping-address";
import { buildOsmExternalShippingMapUrl } from "@/lib/maps/osm-external-shipping-map-url";
import {
  buildOsmTileUrl,
  buildShippingMapTileLayout,
} from "@/lib/maps/osm-tile-shipping-map-layout";

type Props = {
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
};

/**
 * Statischer Kartenausschnitt zur Lieferadresse (OSM-Kacheln, Graustufen).
 * Kein interaktives Embed — ohne Zoom-/+−-Steuerung und ohne irreführendes Panning.
 */
export async function OrderShippingMapSnippet({ line1, line2, zip, city, country }: Props) {
  const coords = await geocodeShippingAddress({ line1, line2, zip, city, country });
  if (!coords) return null;

  const layout = buildShippingMapTileLayout(coords.lat, coords.lon);
  const externalMapUrl = buildOsmExternalShippingMapUrl(coords.lat, coords.lon);

  return (
    <figure className="mx-auto mt-8 w-full max-w-2xl">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm dark:border-white/15 dark:bg-neutral-900"
        aria-hidden
      >
        <div
          className="absolute grayscale contrast-[1.03]"
          style={{
            width: layout.gridWidth,
            height: layout.gridHeight,
            left: layout.gridLeft,
            top: layout.gridTop,
            display: "grid",
            gridTemplateColumns: `repeat(${layout.tileColumns}, 256px)`,
            gridTemplateRows: `repeat(${layout.tileRows}, 256px)`,
          }}
        >
          {layout.tiles.map((tile) => (
            <img
              key={`${layout.zoom}-${tile.x}-${tile.y}`}
              src={buildOsmTileUrl(layout.zoom, tile.x, tile.y)}
              alt=""
              width={256}
              height={256}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block size-full"
            />
          ))}
        </div>
        {/* Markengrün: Pin an Kartenmitte (= Geokoordinate). */}
        <svg
          aria-hidden
          viewBox="0 0 48 56"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[4.5rem] w-16 -translate-x-1/2 -translate-y-full text-primary drop-shadow-md"
        >
          <path
            fill="currentColor"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
            d="M24 3C14.6 3 7 10.6 7 20c0 12 17 33 17 33s17-21 17-33C41 10.6 33.4 3 24 3zm0 26a9 9 0 110-18 9 9 0 010 18z"
          />
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-xs text-(--foreground-muted)">
        <a
          href={externalMapUrl}
          className="font-medium text-primary underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Interaktive Karte öffnen
        </a>
        {" · "}
        Kartenmaterial ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="text-primary underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap-Mitwirkende
        </a>
      </figcaption>
    </figure>
  );
}
