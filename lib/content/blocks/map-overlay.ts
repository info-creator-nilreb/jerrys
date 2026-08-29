import { z } from "zod";
import {
  emptyToNull,
  optionalBlockText,
  optionalHttpOrPathSchema,
} from "@/lib/content/block-data-helpers";
import { buildOsmExternalShippingMapUrl } from "@/lib/maps/osm-external-shipping-map-url";

export const MAP_OVERLAY_SPANS = ["near", "neighborhood", "city"] as const;
export type MapOverlaySpan = (typeof MAP_OVERLAY_SPANS)[number];

export const MAP_OVERLAY_SPAN_LABELS: Record<
  MapOverlaySpan,
  { title: string; hint: string }
> = {
  near: { title: "Nah", hint: "Straßenabschnitt, stark herangezoomt" },
  neighborhood: { title: "Viertel", hint: "Kiez / Vorlage, etwa 1 km Breite" },
  city: { title: "Stadt", hint: "weiterer Ausschnitt" },
};

/** Halbe sichtbare Breite in Metern. Kleiner = näher (größerer Zoom). */
export const MAP_OVERLAY_SPAN_METERS: Record<MapOverlaySpan, number> = {
  near: 280,
  neighborhood: 550,
  city: 1400,
};

export const MAP_OVERLAY_POSITIONS = ["left", "right"] as const;
export type MapOverlayPosition = (typeof MAP_OVERLAY_POSITIONS)[number];

export const LOCATION_MAP_VIEWPORT = {
  width: 1600,
  height: 560,
} as const;

/** Seitenverhältnis der gestapelten Mobilkarte — muss zum CSS `aspect-[5/4]` passen. */
export const LOCATION_MAP_VIEWPORT_MOBILE = {
  width: 800,
  height: 640,
} as const;

function parseOptionalCoord(value: unknown): number | null {
  const v = emptyToNull(value);
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

function parseMapSpan(value: unknown): MapOverlaySpan {
  if (
    typeof value === "string" &&
    (MAP_OVERLAY_SPANS as readonly string[]).includes(value)
  ) {
    return value as MapOverlaySpan;
  }
  return "neighborhood";
}

function parseOverlayPosition(value: unknown): MapOverlayPosition {
  if (
    typeof value === "string" &&
    (MAP_OVERLAY_POSITIONS as readonly string[]).includes(value)
  ) {
    return value as MapOverlayPosition;
  }
  return "left";
}

export const mapOverlayBlockDataSchema = z
  .object({
    /** Freitext für Nominatim, z. B. „Stargarder Str. 16, 10437 Berlin“. */
    query: optionalBlockText(200),
    lat: z.preprocess(
      parseOptionalCoord,
      z.number().min(-90).max(90).nullable(),
    ),
    lon: z.preprocess(
      parseOptionalCoord,
      z.number().min(-180).max(180).nullable(),
    ),
    mapSpan: z.preprocess(parseMapSpan, z.enum(MAP_OVERLAY_SPANS)),
    grayscale: z.boolean().default(true),
    overlayPosition: z.preprocess(parseOverlayPosition, z.enum(MAP_OVERLAY_POSITIONS)),
    headline: optionalBlockText(120),
    address: optionalBlockText(400),
    hours: optionalBlockText(240),
    ctaLabel: optionalBlockText(80),
    ctaHref: optionalHttpOrPathSchema,
  })
  .refine((d) => Boolean(d.query) || (d.lat != null && d.lon != null), {
    message: "Adresse oder Koordinaten angeben.",
    path: ["query"],
  });

export type MapOverlayBlockData = z.infer<typeof mapOverlayBlockDataSchema>;

export function mapOverlayHasCard(
  data: Pick<
    MapOverlayBlockData,
    "headline" | "address" | "hours" | "ctaLabel"
  >,
): boolean {
  return Boolean(data.headline || data.address || data.hours || data.ctaLabel);
}

export function mapOverlayHeadingId(blockId: string): string {
  return `map-overlay-${blockId}`;
}

/**
 * Sichtbare Pin-Lage im Kartenausschnitt, wenn ein Overlay die Mitte verdeckt.
 * `map-right` = Pin rechts neben linker Karte; `map-left` = links neben rechter Karte.
 */
export type MapOverlayPinSlot = "center" | "map-left" | "map-right";

/** Horizontaler Pin-Anteil im sichtbaren Ausschnitt (ohne die Karte zu strecken). */
export const MAP_OVERLAY_PIN_X_RATIO: Record<MapOverlayPinSlot, number> = {
  center: 0.5,
  "map-right": 0.68,
  "map-left": 0.32,
};

export function mapOverlayPinSlot(
  hasCard: boolean,
  overlayPosition: MapOverlayPosition,
): MapOverlayPinSlot {
  if (!hasCard) return "center";
  return overlayPosition === "right" ? "map-left" : "map-right";
}

export function mapOverlaySearchUrl(query: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query.trim())}`;
}

export function resolveMapOverlayCtaHref(
  data: Pick<MapOverlayBlockData, "ctaLabel" | "ctaHref" | "query">,
  coords: { lat: number; lon: number } | null,
): string | null {
  const custom = data.ctaHref?.trim();
  if (custom) return custom;
  if (!data.ctaLabel?.trim()) return null;
  if (coords) return buildOsmExternalShippingMapUrl(coords.lat, coords.lon);
  if (data.query?.trim()) return mapOverlaySearchUrl(data.query);
  return null;
}
