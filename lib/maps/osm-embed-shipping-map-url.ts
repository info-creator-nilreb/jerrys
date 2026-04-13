/**
 * OpenStreetMap-Embed (mapnik) um einen Punkt herum.
 * bbox = minLon, minLat, maxLon, maxLat
 * @see https://wiki.openstreetmap.org/wiki/Browsing#Embedding_a_map_in_a_website
 */
export function buildOsmEmbedShippingMapUrl(lat: number, lon: number): string {
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111_320;
  const metersPerDegLon = Math.max(25_000, 111_320 * Math.cos(latRad));
  const halfWidthM = 620;
  const halfHeightM = halfWidthM / (16 / 10);
  const dLat = halfHeightM / metersPerDegLat;
  const dLon = halfWidthM / metersPerDegLon;
  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  const minLon = lon - dLon;
  const maxLon = lon + dLon;
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  // Ohne `marker`: eigener Pin in der UI (Markengrün), sonst doppelt mit OSM-Standardpin.
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`;
}
