import { MapBasemapAttribution } from "@/components/maps/map-basemap-attribution";
import { OsmStaticMapCanvas } from "@/components/maps/osm-static-map-canvas";
import { geocodeShippingAddress } from "@/lib/maps/geocode-shipping-address";
import { buildOsmExternalShippingMapUrl } from "@/lib/maps/osm-external-shipping-map-url";
import { buildShippingMapTileLayout } from "@/lib/maps/osm-tile-shipping-map-layout";

type Props = {
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
};

/**
 * Statischer Kartenausschnitt zur Lieferadresse (helle Rasterkacheln, Graustufen).
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
        <OsmStaticMapCanvas layout={layout} pinClassName="text-primary" />
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
        <MapBasemapAttribution />
      </figcaption>
    </figure>
  );
}
