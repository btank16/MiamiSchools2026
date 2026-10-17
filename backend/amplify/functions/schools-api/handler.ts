import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GooglePlacesClient, GooglePlacesError } from './googleplaces';
import { GreatSchoolsClient, GreatSchoolsError, type FilterParams, type LevelCode, type SchoolType } from './greatschools';
import { MiamiDadeGisClient, MiamiDadeGisError } from './miamidade';

// Routes (all GET):
//   /schools/nearby?lat=&lon=[&distance=]   schools nearest a coordinate
//   /schools?zip=  or  /schools?city=&state= schools in a zip code or city
//   /schools/{universalId}                  a single school
//   /usage                                  GreatSchools quota for the current key
//   /places/autocomplete?input=[&session=]  address suggestions (Google Places)
//   /places/{placeId}[?session=]            address + coordinates for a suggestion
//   /address/report?lat=&lon=[&radius=&limit=]  Miami-Dade County data for a point: zoned schools,
//                                           School Board district, nearby schools/daycares/clinics
// Shared school list filters: type=public,charter,private  level=e,m,h  limit=1-50  page=0+

const SCHOOL_TYPES: SchoolType[] = ['public', 'charter', 'private'];
const LEVEL_CODES: LevelCode[] = ['e', 'm', 'h'];

class BadRequest extends Error {}
class MissingConfig extends Error {}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') return respond(204, null);
  if (event.httpMethod !== 'GET') return respond(405, { error: 'Method not allowed' });

  const query = event.queryStringParameters ?? {};
  const path = event.path.replace(/\/+$/, '') || '/';

  try {
    if (path === '/schools/nearby') {
      return respond(200, await greatSchools().listNearby({
        lat: parseNumber(query, 'lat', { required: true, min: -90, max: 90 })!,
        lon: parseNumber(query, 'lon', { required: true, min: -180, max: 180 })!,
        distance: parseNumber(query, 'distance', { min: 1, max: 50 }),
        ...parseFilters(query),
      }));
    }

    if (path === '/schools') {
      const filters = parseFilters(query);
      if (query.zip) {
        if (!/^\d{5}$/.test(query.zip)) throw new BadRequest('zip must be a 5-digit zip code');
        return respond(200, await greatSchools().listByLocation({ zip: query.zip, ...filters }));
      }
      if (query.city && query.state) {
        return respond(200, await greatSchools().listByLocation({ city: query.city, state: query.state, ...filters }));
      }
      throw new BadRequest('Provide either zip, or city and state');
    }

    const schoolMatch = path.match(/^\/schools\/([^/]+)$/);
    if (schoolMatch) {
      const universalId = decodeURIComponent(schoolMatch[1]);
      if (!/^\d{7}$/.test(universalId)) throw new BadRequest('School id must be a 7-digit GreatSchools universal id');
      return respond(200, await greatSchools().getSchool(universalId));
    }

    if (path === '/usage') return respond(200, await greatSchools().getUsage());

    if (path === '/address/report') {
      return respond(200, await miamiDade.getAddressReport({
        lat: parseNumber(query, 'lat', { required: true, min: -90, max: 90 })!,
        lon: parseNumber(query, 'lon', { required: true, min: -180, max: 180 })!,
        radiusMiles: parseNumber(query, 'radius', { min: 0.25, max: 5 }) ?? 2,
        limit: parseNumber(query, 'limit', { min: 1, max: 50, integer: true }) ?? 10,
      }));
    }

    // Google Places results may not be cached under Google's terms, so these skip Cache-Control.
    if (path === '/places/autocomplete') {
      const input = query.input?.trim() ?? '';
      if (input.length < 2 || input.length > 200) throw new BadRequest('input must be 2-200 characters');
      const suggestions = await googlePlaces().autocomplete(input, parseSession(query));
      return respond(200, { suggestions }, { cache: false });
    }

    const placeMatch = path.match(/^\/places\/([^/]+)$/);
    if (placeMatch) {
      const placeId = decodeURIComponent(placeMatch[1]);
      if (!/^[A-Za-z0-9_-]{10,1024}$/.test(placeId)) throw new BadRequest('Invalid place id');
      return respond(200, await googlePlaces().getPlace(placeId, parseSession(query)), { cache: false });
    }

    return respond(404, { error: `No route for ${path}` });
  } catch (err) {
    if (err instanceof BadRequest) return respond(400, { error: err.message });
    if (err instanceof MissingConfig) {
      console.error(err.message);
      return respond(500, { error: err.message });
    }
    if (err instanceof GreatSchoolsError) {
      console.error(err.message);
      if (err.status === 404) return respond(404, { error: 'School not found' });
      if (err.status === 429) return respond(429, { error: 'GreatSchools rate limit or plan limit reached' });
      if (err.status === 401 || err.status === 403) return respond(502, { error: 'GreatSchools rejected the API key' });
      return respond(502, { error: 'GreatSchools request failed' });
    }
    if (err instanceof GooglePlacesError) {
      console.error(err.message);
      if (err.status === 400 || err.status === 404) return respond(404, { error: 'Place not found' });
      if (err.status === 429) return respond(429, { error: 'Google Places rate limit reached' });
      if (err.status === 401 || err.status === 403) return respond(502, { error: 'Google Places rejected the API key' });
      return respond(502, { error: 'Google Places request failed' });
    }
    if (err instanceof MiamiDadeGisError) {
      console.error(err.message);
      return respond(502, { error: 'Miami-Dade County GIS request failed' });
    }
    console.error(err);
    return respond(500, { error: 'Internal server error' });
  }
};

// Module scope so warm Lambda containers reuse its cached school directory.
const miamiDade = new MiamiDadeGisClient();

function greatSchools(): GreatSchoolsClient {
  const apiKey = process.env.GREATSCHOOLS_API_KEY;
  if (!apiKey) throw new MissingConfig('Server is missing its GreatSchools API key');
  return new GreatSchoolsClient(apiKey);
}

function googlePlaces(): GooglePlacesClient {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new MissingConfig('Server is missing its Google Maps API key');
  return new GooglePlacesClient(apiKey);
}

type Query = Record<string, string | undefined>;

function parseFilters(query: Query): FilterParams {
  return {
    schoolTypes: parseList(query, 'type', SCHOOL_TYPES),
    levelCodes: parseList(query, 'level', LEVEL_CODES),
    limit: parseNumber(query, 'limit', { min: 1, max: 50, integer: true }),
    page: parseNumber(query, 'page', { min: 0, integer: true }),
  };
}

// Session tokens group autocomplete keystrokes + the final place lookup into one
// billed session. Google recommends a UUID; accept any short URL-safe string.
function parseSession(query: Query): string | undefined {
  const session = query.session;
  if (!session) return undefined;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(session)) throw new BadRequest('session must be a URL-safe string (e.g. a UUID)');
  return session;
}

function parseNumber(
  query: Query,
  name: string,
  opts: { required?: boolean; min?: number; max?: number; integer?: boolean },
): number | undefined {
  const raw = query[name];
  if (raw === undefined || raw === '') {
    if (opts.required) throw new BadRequest(`${name} is required`);
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || (opts.integer && !Number.isInteger(value))) {
    throw new BadRequest(`${name} must be ${opts.integer ? 'an integer' : 'a number'}`);
  }
  if ((opts.min !== undefined && value < opts.min) || (opts.max !== undefined && value > opts.max)) {
    throw new BadRequest(`${name} must be between ${opts.min ?? '-∞'} and ${opts.max ?? '∞'}`);
  }
  return value;
}

function parseList<T extends string>(query: Query, name: string, allowed: T[]): T[] | undefined {
  const raw = query[name];
  if (!raw) return undefined;
  const values = raw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  const invalid = values.filter((v) => !allowed.includes(v as T));
  if (invalid.length) throw new BadRequest(`Invalid ${name}: ${invalid.join(', ')}. Allowed: ${allowed.join(', ')}`);
  return [...new Set(values)] as T[];
}

function respond(statusCode: number, body: unknown, { cache = true } = {}): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      // School directory data changes rarely; let browsers/CDNs cache successful
      // responses so we don't burn through the monthly GreatSchools call quota.
      'Cache-Control': statusCode === 200 && cache ? 'public, max-age=3600' : 'no-store',
    },
    body: body === null ? '' : JSON.stringify(body),
  };
}
