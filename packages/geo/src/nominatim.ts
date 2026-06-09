/**
 * OpenStreetMap Nominatim reverse geocoding — free, no API key required.
 * @see https://nominatim.org/release-docs/latest/api/Reverse/
 * @see https://operations.osmfoundation.org/policies/nominatim/ (User-Agent + rate limits)
 */

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_USER_AGENT = 'AWAAZ/1.0 (civic engagement platform)';

interface NominatimReverseResponse {
  display_name?: string;
  error?: string;
}

export async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
): Promise<{ address: string }> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '18');
  url.searchParams.set('accept-language', 'en');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': NOMINATIM_USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (res.status === 429) {
    throw new Error('Address lookup is temporarily rate-limited. Try again in a moment.');
  }

  const data = (await res.json()) as NominatimReverseResponse;

  if (!res.ok) {
    throw new Error(data.error ?? `Reverse geocoding failed (${res.status})`);
  }

  const address = data.display_name?.trim();
  if (!address) {
    throw new Error('No address found for this location.');
  }

  return { address };
}
