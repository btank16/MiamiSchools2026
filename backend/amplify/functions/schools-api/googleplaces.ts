// Thin client for Google Places API (New): address autocomplete + place lookup.
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
//       https://developers.google.com/maps/documentation/places/web-service/place-details

const BASE_URL = 'https://places.googleapis.com/v1';

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

  private async request(path: string, fieldMask: string, init: RequestInit): Promise<any> {
    const res = await fetch(BASE_URL + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask,
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
