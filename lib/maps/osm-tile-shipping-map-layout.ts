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

export function buildShippingMapTileLayout(lat: number, lon: number): ShippingMapTileLayout {
  const { width: viewportWidth, height: viewportHeight, halfWidthM } = SHIPPING_MAP_VIEWPORT;
  const zoom = shippingMapZoomForSpan(lat, halfWidthM, viewportWidth);
  const center = latLonToWorldPixel(lat, lon, zoom);

  const left = center.x - viewportWidth / 2;
  const top = center.y - viewportHeight / 2;
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
  };
}

export function buildOsmTileUrl(zoom: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}
