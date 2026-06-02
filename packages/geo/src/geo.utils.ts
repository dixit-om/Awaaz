// ---------------------------------------------------------------------------
// Geo utility functions — pure, no DB dependencies
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Coordinate validation
// ---------------------------------------------------------------------------

/** India bounding box in WGS84. Keeps garbage GPS off the map. */
const INDIA_BOUNDS = {
  lat: { min: 6.5, max: 37.6 },
  lng: { min: 68.1, max: 97.4 },
} as const;

/**
 * Returns true if the coordinate pair is a valid WGS84 point inside India.
 * Used as a fast pre-check before hitting PostGIS.
 */
export function isValidIndiaCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= INDIA_BOUNDS.lat.min &&
    lat <= INDIA_BOUNDS.lat.max &&
    lng >= INDIA_BOUNDS.lng.min &&
    lng <= INDIA_BOUNDS.lng.max
  );
}

/**
 * Returns a PostGIS-compatible ST_MakePoint expression string.
 * Note: PostGIS uses (longitude, latitude) order — this function
 * enforces the correct order so callers never get it wrong.
 */
export function makePointWkt(lat: number, lng: number): string {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
}

// ---------------------------------------------------------------------------
// GeoJSON validation
// ---------------------------------------------------------------------------

type GeoJsonGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection';

interface GeoJsonGeometry {
  type: GeoJsonGeometryType;
  coordinates?: unknown;
  geometries?: unknown;
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown> | null;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

type GeoJson = GeoJsonGeometry | GeoJsonFeature | GeoJsonFeatureCollection;

/**
 * Minimal structural validation of a GeoJSON object.
 * Does not validate coordinate ranges — use isValidIndiaCoordinate for that.
 */
export function isValidGeoJson(value: unknown): value is GeoJson {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  const validTypes = [
    'Point',
    'MultiPoint',
    'LineString',
    'MultiLineString',
    'Polygon',
    'MultiPolygon',
    'GeometryCollection',
    'Feature',
    'FeatureCollection',
  ];

  if (!('type' in obj) || !validTypes.includes(obj['type'] as string)) {
    return false;
  }

  if (obj['type'] === 'FeatureCollection') {
    return Array.isArray(obj['features']);
  }

  if (obj['type'] === 'Feature') {
    return 'geometry' in obj && 'properties' in obj;
  }

  if (obj['type'] === 'GeometryCollection') {
    return Array.isArray(obj['geometries']);
  }

  // All other geometry types require a coordinates array
  return 'coordinates' in obj && Array.isArray(obj['coordinates']);
}

/**
 * Returns true if the GeoJSON represents a Polygon or MultiPolygon.
 * Only these types are valid constituency boundary geometries.
 */
export function isPolygonGeoJson(value: unknown): boolean {
  if (!isValidGeoJson(value)) return false;
  const obj = value as unknown as Record<string, unknown>;
  if (obj['type'] === 'Feature') {
    const geom = obj['geometry'] as Record<string, unknown> | null;
    return geom !== null && (geom['type'] === 'Polygon' || geom['type'] === 'MultiPolygon');
  }
  return obj['type'] === 'Polygon' || obj['type'] === 'MultiPolygon';
}

/**
 * Extracts the raw geometry from a GeoJSON Feature or returns the
 * geometry directly if already a geometry type.
 * Returns null if the input is invalid or not a polygon geometry.
 */
export function extractPolygonGeometry(value: unknown): GeoJsonGeometry | null {
  if (!isValidGeoJson(value)) return null;
  const raw = value as unknown as Record<string, unknown>;

  if (raw['type'] === 'Feature') {
    const geom = raw['geometry'] as GeoJsonGeometry | null;
    if (!geom) return null;
    return geom.type === 'Polygon' || geom.type === 'MultiPolygon' ? geom : null;
  }

  if (raw['type'] === 'Polygon' || raw['type'] === 'MultiPolygon') {
    return raw as unknown as GeoJsonGeometry;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Returns a rough bounding box string for logging/debugging.
 */
export function formatBbox(bbox: BoundingBox): string {
  return (
    `[${bbox.minLng.toFixed(4)},${bbox.minLat.toFixed(4)}` +
    ` → ${bbox.maxLng.toFixed(4)},${bbox.maxLat.toFixed(4)}]`
  );
}

/**
 * Returns true if the point (lat, lng) falls within the bounding box.
 * Used as a fast pre-filter before the more expensive ST_Contains query.
 */
export function isPointInBbox(lat: number, lng: number, bbox: BoundingBox): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

// ---------------------------------------------------------------------------
// Distance / radius helpers (used for future ST_DWithin queries)
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;

/**
 * Haversine formula — returns approximate great-circle distance in metres
 * between two WGS84 points. Accurate enough for civic use within a city.
 * Used for pre-filtering before ST_DWithin when PostGIS is not available.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// Coordinate formatting
// ---------------------------------------------------------------------------

/**
 * Formats a coordinate pair for display in notifications / audit logs.
 * e.g.  "26.9124° N, 75.7873° E"
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}
