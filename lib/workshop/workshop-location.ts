/** Adresse eines Workshop-Termins (Admin + Storefront). */

export type WorkshopSessionLocationFields = {
  locationLabel: string;
  locationLine1: string | null;
  locationLine2?: string | null;
  locationZip: string | null;
  locationCity: string | null;
  locationCountry: string | null;
};

export function hasWorkshopSessionStreetAddress(
  location: Pick<
    WorkshopSessionLocationFields,
    "locationLine1" | "locationZip" | "locationCity"
  >,
): boolean {
  return Boolean(
    location.locationLine1?.trim() &&
      location.locationZip?.trim() &&
      location.locationCity?.trim(),
  );
}

export function formatWorkshopSessionStreetLines(
  location: WorkshopSessionLocationFields,
): string[] {
  if (!hasWorkshopSessionStreetAddress(location)) {
    return [];
  }
  const lines: string[] = [location.locationLine1!.trim()];
  if (location.locationLine2?.trim()) {
    lines.push(location.locationLine2.trim());
  }
  const country = (location.locationCountry?.trim() || "DE").toUpperCase();
  lines.push(`${location.locationZip!.trim()} ${location.locationCity!.trim()}`.trim());
  if (country !== "DE") {
    lines.push(country);
  }
  return lines;
}

export function formatWorkshopSessionLocationBlock(location: WorkshopSessionLocationFields): {
  headline: string;
  addressLines: string[];
} {
  return {
    headline: location.locationLabel.trim(),
    addressLines: formatWorkshopSessionStreetLines(location),
  };
}

export function workshopSessionMapsSearchUrl(location: WorkshopSessionLocationFields): string | null {
  const parts = [
    location.locationLine1,
    location.locationLine2,
    location.locationZip,
    location.locationCity,
    location.locationCountry,
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const query = parts.join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
