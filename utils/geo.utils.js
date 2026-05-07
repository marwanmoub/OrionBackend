/**
 * utils/geo.utils.js
 * Coordinate helpers reused by guide.service.js
 */

/**
 * Safely extract { lat, lng } from an airport's geo_json_data field.
 * Handles three shapes:
 *   { lat, lng }
 *   { latitude, longitude }
 *   GeoJSON Point { type:"Point", coordinates:[lng,lat] }
 *
 * @param {any} geoJsonData  – raw value from Prisma (object or null)
 * @returns {{ lat: number, lng: number } | null}
 */
export function extractAirportCoords(geoJsonData) {
  if (!geoJsonData) return null;

  try {
    const d =
      typeof geoJsonData === "string" ? JSON.parse(geoJsonData) : geoJsonData;

    if (typeof d.lat === "number" && typeof d.lng === "number") {
      return { lat: d.lat, lng: d.lng };
    }

    if (typeof d.latitude === "number" && typeof d.longitude === "number") {
      return { lat: d.latitude, lng: d.longitude };
    }

    if (
      d.type === "Point" &&
      Array.isArray(d.coordinates) &&
      d.coordinates.length >= 2
    ) {
      // GeoJSON is [lng, lat]
      return { lat: d.coordinates[1], lng: d.coordinates[0] };
    }
  } catch {
    // malformed – fall through
  }

  return null;
}

/**
 * Haversine distance between two WGS-84 points, in kilometres.
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
