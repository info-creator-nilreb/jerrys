import { geocodeShippingAddress } from "@/lib/maps/geocode-shipping-address";
import { buildOsmEmbedShippingMapUrl } from "@/lib/maps/osm-embed-shipping-map-url";

type Props = {
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
};

/**
 * Kleiner Kartenausschnitt zur Lieferadresse (OSM-Embed, per CSS Graustufen).
 */
export async function OrderShippingMapSnippet({ line1, line2, zip, city, country }: Props) {
  const coords = await geocodeShippingAddress({ line1, line2, zip, city, country });
  if (!coords) return null;

  const src = buildOsmEmbedShippingMapUrl(coords.lat, coords.lon);

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm dark:border-white/15 dark:bg-neutral-900">
        <iframe
          title="Ungefährer Kartenausschnitt zur Lieferadresse"
          src={src}
          width={960}
          height={600}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full border-0 grayscale contrast-[1.03]"
        />
        {/* Markengrün: eigener Pin, Kartenmitte = Zielpunkt (bbox symmetrisch um Koordinate) */}
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
    </div>
  );
}
