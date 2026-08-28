/** Logische Viewport-Größe (CSS skaliert responsiv). */
export const SHIPPING_MAP_VIEWPORT = {
  width: 960,
  height: 600,
  /** Halbe sichtbare Breite in Metern — analog zum früheren OSM-Embed-bbox. */
  halfWidthM: 620,
} as const;

const TILE_SIZE = 256;
const MAX_ZOOM = 18;

export type ShippingMapTile = { x: number; y: number };

export type ShippingMapTileLayout = {
  zoom: number;
  tiles: ShippingMapTile[];
  tileColumns: number;
  tileRows: number;
  /** Position des Tile-Rasters relativ zum Kartenausschnitt (Prozent des Viewports). */
  gridLeftPct: number;
  gridTopPct: number;
  gridWidthPct: number;
  gridHeightPct: number;
  viewportWidth: number;
  viewportHeight: number;
  /** Pin-Lage im Viewport (Prozent); entspricht der Geokoordinate. */
  pinXPct: number;
  pinYPct: number;
};

function latLonToWorldPixel(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lon + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

export function shippingMapZoomForSpan(
  lat: number,
  halfSpanMeters: number,
  viewportWidthPx: number,
): number {
  const latRad = (lat * Math.PI) / 180;
  const metersPerPixel = (2 * halfSpanMeters) / viewportWidthPx;
  const zoom = Math.log2((156543.03392 * Math.cos(latRad)) / metersPerPixel);
  return Math.max(1, Math.min(MAX_ZOOM, Math.round(zoom)));
}

/** Zentrierter Kartenausschnitt (Lieferkarte, CMS-Standortkarte). */
export function buildOsmCenteredTileLayout(input: {
  lat: number;
  lon: number;
  viewportWidth: number;
  viewportHeight: number;
  halfWidthM: number;
  /** 0.5 = Mitte; z. B. 0.68 = Pin rechts neben linkem Overlay. */
  pinXRatio?: number;
  pinYRatio?: number;
}): ShippingMapTileLayout {
  const { lat, lon, viewportWidth, viewportHeight, halfWidthM } = input;
  const pinXRatio = Math.min(0.82, Math.max(0.18, input.pinXRatio ?? 0.5));
  const pinYRatio = Math.min(0.82, Math.max(0.18, input.pinYRatio ?? 0.5));
  const zoom = shippingMapZoomForSpan(lat, halfWidthM, viewportWidth);
  const center = latLonToWorldPixel(lat, lon, zoom);

  const left = center.x - viewportWidth * pinXRatio;
  const top = center.y - viewportHeight * pinYRatio;
  const startTileX = Math.floor(left / TILE_SIZE);
  const startTileY = Math.floor(top / TILE_SIZE);
  const endTileX = Math.ceil((left + viewportWidth) / TILE_SIZE);
  const endTileY = Math.ceil((top + viewportHeight) / TILE_SIZE);

  const tileColumns = endTileX - startTileX;
  const tileRows = endTileY - startTileY;
  const gridLeft = startTileX * TILE_SIZE - left;
  const gridTop = startTileY * TILE_SIZE - top;
  const gridWidth = tileColumns * TILE_SIZE;
  const gridHeight = tileRows * TILE_SIZE;

  const tiles: ShippingMapTile[] = [];
  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      tiles.push({ x, y });
    }
  }

  return {
    zoom,
    tiles,
    tileColumns,
    tileRows,
    gridLeftPct: (gridLeft / viewportWidth) * 100,
    gridTopPct: (gridTop / viewportHeight) * 100,
    gridWidthPct: (gridWidth / viewportWidth) * 100,
    gridHeightPct: (gridHeight / viewportHeight) * 100,
    viewportWidth,
    viewportHeight,
    pinXPct: pinXRatio * 100,
    pinYPct: pinYRatio * 100,
  };
}

export function buildShippingMapTileLayout(lat: number, lon: number): ShippingMapTileLayout {
  const { width: viewportWidth, height: viewportHeight, halfWidthM } = SHIPPING_MAP_VIEWPORT;
  return buildOsmCenteredTileLayout({
    lat,
    lon,
    viewportWidth,
    viewportHeight,
    halfWidthM,
  });
}

/**
 * Helle, detailarme Rasterkacheln (CARTO Positron / light_all) — näher an Graustufen-Google
 * als OSM-Mapnik (Gebäudeumrisse, POI-Icons, harte Bahnlinien).
 */
export function buildMutedMapTileUrl(zoom: number, x: number, y: number): string {
  const world = 2 ** zoom;
  const wrappedX = ((x % world) + world) % world;
  return `https://basemaps.cartocdn.com/light_all/${zoom}/${wrappedX}/${y}.png`;
}

/** Alias für bestehende Aufrufer. */
export function buildOsmTileUrl(zoom: number, x: number, y: number): string {
  return buildMutedMapTileUrl(zoom, x, y);
}

/** Graustufen, helleres Grau, weniger Kontrast (Standortkarte + Checkout). */
export const MUTED_MAP_FILTER_CLASS = "grayscale contrast-[0.88] brightness-[1.08]";
