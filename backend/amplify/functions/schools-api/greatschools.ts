// Thin client for the GreatSchools NearbySchools API v2.
// Docs: https://documenter.getpostman.com/view/27756678/2sA3s7hoDd

const BASE_URL = 'https://gs-api.greatschools.org/v2';

export type SchoolType = 'public' | 'charter' | 'private';
export type LevelCode = 'e' | 'm' | 'h';

export interface School {
  universalId: string;
  ncesId: string | null;
  stateId: string | null;
  name: string;
  summary: string | null;
  type: SchoolType;
  levelCodes: string[];
  grades: string[];
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  fipsCounty: number | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  fax: string | null;
  districtName: string | null;
  districtId: number | null;
  website: string | null;
  greatSchoolsUrl: string | null;
  ratingBand: string | null;
  // Only returned by the nearby-schools endpoint.
  distanceMiles?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  maxPage: number;
  totalCount: number;
}

export interface SchoolList {
  schools: School[];
  pagination: Pagination;
}

export interface Usage {
  callsMade: number;
  remainingCalls: number;
  periodStart: string;
  periodEnd: string;
}

export interface FilterParams {
  schoolTypes?: SchoolType[];
  levelCodes?: LevelCode[];
  limit?: number;
  page?: number;
}

export interface NearbyParams extends FilterParams {
  lat: number;
  lon: number;
  distance?: number;
}

export type LocationParams = FilterParams & ({ zip: string } | { city: string; state: string });

export class GreatSchoolsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class GreatSchoolsClient {
  constructor(private readonly apiKey: string) {}

  listNearby(params: NearbyParams): Promise<SchoolList> {
    return this.listSchools('/nearby-schools', {
      lat: params.lat,
      lon: params.lon,
      distance: params.distance,
      ...filterQuery(params),
    });
  }

  listByLocation(params: LocationParams): Promise<SchoolList> {
    const location = 'zip' in params ? { zip: params.zip } : { city: params.city, state: params.state };
    return this.listSchools('/schools', { ...location, ...filterQuery(params) });
  }

  async getSchool(universalId: string): Promise<School> {
    return normalizeSchool(await this.request(`/schools/${encodeURIComponent(universalId)}`));
  }

  async getUsage(): Promise<Usage> {
    const raw = await this.request('/usage');
    return {
      callsMade: raw.current_usage?.calls_made,
      remainingCalls: raw.current_usage?.remaining_calls,
      periodStart: raw.metering_period?.start_date,
      periodEnd: raw.metering_period?.end_date,
    };
  }

  private async listSchools(path: string, query: Query): Promise<SchoolList> {
    const raw = await this.request(path, query);
    return {
      schools: (raw.schools ?? []).map(normalizeSchool),
      pagination: {
        page: raw.cur_page ?? 0,
        limit: raw.items_per_page ?? 0,
        maxPage: raw.max_page_num ?? 0,
        totalCount: raw.total_count ?? 0,
      },
    };
  }

  private async request(path: string, query: Query = {}): Promise<any> {
    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-API-Key': this.apiKey },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new GreatSchoolsError(`GreatSchools ${res.status} on ${path}: ${body.slice(0, 200)}`, res.status);
    }
    return res.json();
  }
}

type Query = Record<string, string | number | undefined>;

function filterQuery({ schoolTypes, levelCodes, limit, page }: FilterParams): Query {
  return {
    // Multiple types use GreatSchools' "(public or charter)" syntax.
    school_type:
      schoolTypes?.length === 1 ? schoolTypes[0] : schoolTypes?.length ? `(${schoolTypes.join(' or ')})` : undefined,
    level_codes: levelCodes?.length ? levelCodes.join(',') : undefined,
    limit,
    page,
  };
}

// The API mixes kebab-case and snake_case keys (e.g. "rating-band" vs "rating_band")
// and sometimes returns the string "null", so normalize everything here.
function normalizeSchool(raw: any): School {
  const school: School = {
    universalId: raw['universal-id'],
    ncesId: raw['nces-id'] ?? null,
    stateId: raw['state-id'] ?? null,
    name: raw.name,
    summary: raw['school-summary'] ?? null,
    type: raw.type,
    levelCodes: splitList(raw['level-codes'] ?? raw['level-code']),
    grades: splitList(raw.level),
    street: raw.street ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    zip: raw.zip ?? null,
    county: raw.county ?? null,
    fipsCounty: raw.fipscounty ?? null,
    lat: raw.lat ?? null,
    lon: raw.lon ?? null,
    phone: raw.phone ?? null,
    fax: raw.fax ?? null,
    districtName: raw['district-name'] ?? null,
    districtId: raw['district-id'] || null,
    website: raw['web-site'] ?? null,
    greatSchoolsUrl: raw['overview-url'] ?? null,
    ratingBand: nullIfEmpty(raw['rating-band'] ?? raw.rating_band),
  };
  if (typeof raw.distance === 'number') school.distanceMiles = raw.distance;
  return school;
}

function splitList(value: string | null | undefined): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

function nullIfEmpty(value: string | null | undefined): string | null {
  return !value || value === 'null' ? null : value;
}
