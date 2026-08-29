import { cache } from "react";
import { nominatimUserAgent } from "@/lib/maps/nominatim-user-agent";

type NominatimHit = {
  lat?: string;
  lon?: string;
  addresstype?: string;
  class?: string;
};

const HOUSE_ADDRESS_TYPES = new Set(["place", "building", "house"]);

function coordsFromHit(hit: NominatimHit): { lat: number; lon: number } | null {
  const lat = hit.lat != null ? Number.parseFloat(hit.lat) : NaN;
  const lon = hit.lon != null ? Number.parseFloat(hit.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

/** Bevorzugt Haus-/Gebäude-Treffer vor POIs im selben Gebäude. */
export function pickNominatimPlaceHit(data: unknown): { lat: number; lon: number } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const hits = data.filter((h): h is NominatimHit => Boolean(h) && typeof h === "object");
  const preferred =
    hits.find((h) => h.addresstype != null && HOUSE_ADDRESS_TYPES.has(h.addresstype)) ??
    hits.find((h) => h.class === "place" || h.class === "building") ??
    hits[0];
  return preferred ? coordsFromHit(preferred) : null;
}

export function buildNominatimPlaceQueryUrl(query: string): string {
  const params = new URLSearchParams({
    format: "json",
    limit: "5",
    addressdetails: "0",
    q: query.trim(),
  });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

/**
 * Freitext-Geocoding (OpenStreetMap Nominatim).
 * Nutzungsbedingungen: https://operations.osmfoundation.org/policies/nominatim/
 */
export const geocodePlaceQuery = cache(
  async (query: string): Promise<{ lat: number; lon: number } | null> => {
    const q = query.trim();
    if (q.length < 3) return null;

    const url = buildNominatimPlaceQueryUrl(q);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": nominatimUserAgent("cms-location-map"),
          Accept: "application/json",
        },
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      return pickNominatimPlaceHit(await res.json());
    } catch {
      return null;
    }
  },
);
