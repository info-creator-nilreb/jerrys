import { cache } from "react";
import { nominatimUserAgent } from "@/lib/maps/nominatim-user-agent";

export type ShippingAddressGeoInput = {
  line1: string;
  line2: string | null | undefined;
  zip: string;
  city: string;
  country: string;
};

type NominatimHit = { lat?: string; lon?: string };

function buildStreet(input: ShippingAddressGeoInput): string {
  const parts = [input.line1.trim(), input.line2?.trim()].filter(Boolean) as string[];
  return parts.join(", ");
}

/**
 * Strukturierte Geocoding-Suche (OpenStreetMap Nominatim).
 * Nutzungsbedingungen: https://operations.osmfoundation.org/policies/nominatim/
 */
export const geocodeShippingAddress = cache(
  async (input: ShippingAddressGeoInput): Promise<{ lat: number; lon: number } | null> => {
    const street = buildStreet(input);
    if (!street || !input.zip.trim() || !input.city.trim()) return null;

    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      addressdetails: "0",
      street,
      postalcode: input.zip.trim(),
      city: input.city.trim(),
    });
    const cc = input.country.trim().toUpperCase();
    if (cc.length === 2) params.set("countrycodes", cc.toLowerCase());

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": nominatimUserAgent("order-confirmation-map"),
          Accept: "application/json",
        },
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const hit = data[0] as NominatimHit;
      const lat = hit.lat != null ? Number.parseFloat(hit.lat) : NaN;
      const lon = hit.lon != null ? Number.parseFloat(hit.lon) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch {
      return null;
    }
  },
);
