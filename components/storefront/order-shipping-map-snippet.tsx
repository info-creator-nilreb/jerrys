import { geocodeShippingAddress } from "@/lib/maps/geocode-shipping-address";
import { buildOsmEmbedShippingMapUrl } from "@/lib/maps/osm-embed-shipping-map-url";
import { buildOsmExternalShippingMapUrl } from "@/lib/maps/osm-external-shipping-map-url";

type Props = {
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
};

/**
 * Statischer Kartenausschnitt zur Lieferadresse (OSM-Embed, Graustufen).
 * Nicht verschiebbar: Overlay-Pin bleibt sonst irreführend an fester Bildschirmposition.
 */
export async function OrderShippingMapSnippet({ line1, line2, zip, city, country }: Props) {
  const coords = await geocodeShippingAddress({ line1, line2, zip, city, country });
  if (!coords) return null;

  const src = buildOsmEmbedShippingMapUrl(coords.lat, coords.lon);
  const externalMapUrl = buildOsmExternalShippingMapUrl(coords.lat, coords.lon);

  return (
    <figure className="mx-auto mt-8 w-full max-w-2xl">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm dark:border-white/15 dark:bg-neutral-900"
        aria-hidden
      >
        <iframe
          title=""
          src={src}
          width={960}
          height={600}
          loading="lazy"
          tabIndex={-1}
          referrerPolicy="strict-origin-when-cross-origin"
          className="pointer-events-none absolute inset-0 h-full w-full select-none border-0 grayscale contrast-[1.03]"
        />
        {/* Markengrün: Pin an Kartenmitte (= Geokoordinate, bbox symmetrisch). */}
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
