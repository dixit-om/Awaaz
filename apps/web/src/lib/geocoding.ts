/** Coordinate formatting helpers for the report location step. */

const OSM_EMBED_DELTA = 0.006;

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

/** OpenStreetMap embed URL — free map preview, no API key. */
export function getOsmMapEmbedUrl(latitude: number, longitude: number): string {
  const minLon = longitude - OSM_EMBED_DELTA;
  const minLat = latitude - OSM_EMBED_DELTA;
  const maxLon = longitude + OSM_EMBED_DELTA;
  const maxLat = latitude + OSM_EMBED_DELTA;
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

  const params = new URLSearchParams({
    bbox,
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}
