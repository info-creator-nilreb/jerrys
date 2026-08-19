/** Vollständige OSM-Karte mit Marker — für „Karte öffnen“ von der Erfolgsseite. */
export function buildOsmExternalShippingMapUrl(lat: number, lon: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}
