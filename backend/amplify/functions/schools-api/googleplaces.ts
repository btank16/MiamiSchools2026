// Thin client for Google Places API (New): address autocomplete + place lookup + school photos,
// plus Street View Static for schools without Places photos.
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
//       https://developers.google.com/maps/documentation/places/web-service/place-details
//       https://developers.google.com/maps/documentation/places/web-service/place-photos
//       https://developers.google.com/maps/documentation/streetview/request-streetview

const BASE_URL = 'https://places.googleapis.com/v1';
const STREETVIEW_URL = 'https://maps.googleapis.com/maps/api/streetview';

// Only request what we return. These fields all bill under the cheapest
// "Place Details Essentials" SKU.
const AUTOCOMPLETE_FIELDS = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text.text',
  'suggestions.placePrediction.structuredFormat',
  'suggestions.placePrediction.types',
].join(',');
const DETAILS_FIELDS = 'id,formattedAddress,addressComponents,location,types';

// Roughly the middle of the county's built-up area; 50 km is the largest bias circle Google accepts.
const MIAMI_DADE_CENTER = { latitude: 25.68, longitude: -80.35 };
const MAX_BIAS_RADIUS_METERS = 50000;

export interface PlaceSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string | null;
  types: string[];
}

export interface Place {
  placeId: string;
  formattedAddress: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  lat: number | null;
  lon: number | null;
  types: string[];
}

export interface StreetViewParams {
  pano: string;
  heading: number;
  fov: number;
  pitch: number;
  width: number;
  height: number;
}

export class GooglePlacesError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class GooglePlacesClient {
  constructor(private readonly apiKey: string) {}

  async autocomplete(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    const raw = await this.request('/places:autocomplete', AUTOCOMPLETE_FIELDS, {
      method: 'POST',
      body: JSON.stringify({
        input,
        sessionToken,
        // GreatSchools only covers US schools.
        includedRegionCodes: ['us'],
        // Rank Miami-Dade addresses first without ruling out the rest of the US.
        locationBias: { circle: { center: MIAMI_DADE_CENTER, radius: MAX_BIAS_RADIUS_METERS } },
        languageCode: 'en',
        regionCode: 'us',
      }),
    });
    return (raw.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map(
        (p: any): PlaceSuggestion => ({
          placeId: p.placeId,
          text: p.text?.text ?? '',
          mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondaryText: p.structuredFormat?.secondaryText?.text ?? null,
          types: p.types ?? [],
        }),
      );
  }

  async getPlace(placeId: string, sessionToken?: string): Promise<Place> {
    const query = new URLSearchParams({ languageCode: 'en', regionCode: 'us' });
    if (sessionToken) query.set('sessionToken', sessionToken);
    const raw = await this.request(`/places/${encodeURIComponent(placeId)}?${query}`, DETAILS_FIELDS, {
      method: 'GET',
    });
    return normalizePlace(raw);
  }

  // `name` is a Places photo resource name: places/{placeId}/photos/{photoRef}. skipHttpRedirect returns
  // the image's own URL as JSON, so the browser can be redirected to it without ever seeing the key.
  async photoUri(name: string, maxWidthPx: number): Promise<string> {
    const query = new URLSearchParams({ maxWidthPx: String(maxWidthPx), skipHttpRedirect: 'true' });
    const raw = await this.request(`/${name}/media?${query}`, null, { method: 'GET' });
    if (!raw.photoUri) throw new GooglePlacesError(`Google Places returned no photoUri for ${name}`, 502);
    return raw.photoUri;
  }

  // Street View Static only accepts the key as a query parameter, so the image is fetched here and
  // returned as bytes rather than redirecting the browser to a URL that carries the key.
  async streetView(p: StreetViewParams): Promise<{ image: Buffer; contentType: string }> {
    const query = new URLSearchParams({
      pano: p.pano,
      heading: String(p.heading),
      fov: String(p.fov),
      pitch: String(p.pitch),
      size: `${p.width}x${p.height}`,
      // 404 instead of Google's grey "no imagery" placeholder, so the page shows its own fallback
      return_error_code: 'true',
      key: this.apiKey,
    });
    const res = await fetch(`${STREETVIEW_URL}?${query}`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new GooglePlacesError(`Street View ${res.status} for pano ${p.pano}: ${body.slice(0, 300)}`, res.status);
    }
    return { image: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? 'image/jpeg' };
  }

  private async request(path: string, fieldMask: string | null, init: RequestInit): Promise<any> {
    const res = await fetch(BASE_URL + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        ...(fieldMask && { 'X-Goog-FieldMask': fieldMask }),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new GooglePlacesError(`Google Places ${res.status} on ${path.split('?')[0]}: ${body.slice(0, 300)}`, res.status);
    }
    return res.json();
  }
}

function normalizePlace(raw: any): Place {
  const components: any[] = raw.addressComponents ?? [];
  const find = (type: string, form: 'longText' | 'shortText' = 'longText'): string | null =>
    components.find((c) => c.types?.includes(type))?.[form] ?? null;

  const street = [find('street_number'), find('route')].filter(Boolean).join(' ') || null;
  return {
    placeId: raw.id,
    formattedAddress: raw.formattedAddress ?? null,
    street,
    city: find('locality') ?? find('sublocality') ?? find('neighborhood'),
    state: find('administrative_area_level_1', 'shortText'),
    zip: find('postal_code'),
    county: find('administrative_area_level_2'),
    lat: raw.location?.latitude ?? null,
    lon: raw.location?.longitude ?? null,
    types: raw.types ?? [],
  };
}
