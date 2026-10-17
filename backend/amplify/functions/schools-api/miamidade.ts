// Client for Miami-Dade County's public ArcGIS feature services (no API key needed).
// Layer and field reference: docs/miami-dade-gis-school-data.md

const BASE_URL = 'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services';
const REQUEST_TIMEOUT_MS = 8000;
// School stops are dense (1,000+ within 2 miles), so search a tight radius and keep the nearest few.
const BUS_STOP_RADIUS_MILES = 0.5;
const BUS_STOP_LIMIT = 3;
// The public school directory is needed for every report (to join zones to capacity/enrollment),
// so warm Lambda containers keep it in memory. The county updates it quarterly.
const DIRECTORY_TTL_MS = 60 * 60 * 1000;

const LAYERS = {
  schoolSites: 'SchoolSite_gdb',
  otherElementary: 'TBLOTHERELEMENTARY',
  elementaryZones: 'ElementaryAttendanceBoundary_gdb',
  middleZones: 'MiddleAttendanceBoundary_gdb',
  highZones: 'HighAttendanceBoundary_gdb',
  boardDistricts: 'SchoolBoardDistrict_gdb',
  charterSchools: 'CharterSchool_gdb',
  privateSchools: 'PrivateSchool_gdb',
  daycares: 'Daycare_gdb',
  headStarts: 'HeadStart_gdb',
  clinics: 'SchoolBasedClinic_gdb',
  busStops: 'MDCPSBusStop_gdb',
} as const;

// SchoolSite TYPE codes for offices, staff training centers and adult education.
const NON_K12_TYPES = new Set(['A', 'PLC', 'O']);
const SCHOOL_TYPE_LABELS: Record<string, PublicSchoolType> = {
  E: 'elementary',
  M: 'middle',
  S: 'high',
  ALT: 'alternative',
  SPC: 'special',
};
const HEAD_START_PROGRAMS: Record<string, HeadStartProgram> = {
  EHS: 'early-head-start',
  GA: 'grantee-agency',
  DA: 'delegate-agency',
};
const COED_LABELS: Record<string, Coed> = { C: 'coed', B: 'boys', G: 'girls' };

const NOTES = [
  'Attendance zones show the zoned school only; magnet, choice and charter enrollment is separate. Confirm with M-DCPS.',
  'School bus stop and school-based clinic data was last updated by the county in 2018.',
];

export interface Address {
  street: string | null;
  city: string | null;
  zip: string | null;
}

interface Located {
  lat: number;
  lon: number;
  distanceMiles: number;
}

export type PublicSchoolType = 'elementary' | 'middle' | 'high' | 'alternative' | 'special' | 'other';
export type HeadStartProgram = 'early-head-start' | 'grantee-agency' | 'delegate-agency';
export type Coed = 'coed' | 'boys' | 'girls';

export interface PublicSchool extends Partial<Located> {
  id: string;
  name: string;
  type: PublicSchoolType;
  grades: string | null;
  address: Address;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  enrollment: number | null;
  // enrollment / capacity, e.g. 0.36 = 36% full
  utilization: number | null;
  // Annexes / satellite sites. Capacity and enrollment above are totals across all campuses.
  otherCampuses: { name: string; address: Address }[];
}

export interface ZonedSchool extends PublicSchool {
  // True for a second school that serves the same zone (e.g. a K-8 sharing an elementary zone).
  sharedZone: boolean;
}

export interface CharterSchool extends Located {
  id: string;
  name: string;
  grades: string | null;
  address: Address;
  phone: string | null;
  email: string | null;
  website: string | null;
  capacity: number | null;
  enrollment: number | null;
}

export interface PrivateSchool extends Located {
  // The layer's OBJECTID; school-data/schools.csv uses it as source_id for private schools.
  id: string;
  name: string;
  grades: string | null;
  address: Address;
  phone: string | null;
  email: string | null;
  website: string | null;
  enrollment: number | null;
  coed: Coed | null;
  yearEstablished: number | null;
}

export interface Daycare extends Located {
  name: string;
  address: Address;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  licenseNumber: string | null;
}

export interface HeadStart extends Located {
  name: string;
  program: HeadStartProgram | null;
  address: Address;
  phone: string | null;
  website: string | null;
}

export interface Clinic extends Located {
  name: string;
  address: Address;
}

export interface BusStop extends Located {
  id: string;
  description: string | null;
  routeIds: string[];
}

export interface NearbyList<T> {
  // How many are within the radius; `items` holds the nearest `limit` of them.
  total: number;
  items: T[];
}

export interface AddressReport {
  location: { lat: number; lon: number };
  // False when the point falls outside every School Board district.
  withinMiamiDade: boolean;
  zonedSchools: {
    elementary: ZonedSchool[];
    middle: ZonedSchool[];
    high: ZonedSchool[];
  };
  schoolBoard: { district: string; member: string | null } | null;
  nearby: {
    radiusMiles: number;
    publicSchools: NearbyList<PublicSchool>;
    charterSchools: NearbyList<CharterSchool>;
    privateSchools: NearbyList<PrivateSchool>;
    daycares: NearbyList<Daycare>;
    headStarts: NearbyList<HeadStart>;
    clinics: NearbyList<Clinic>;
  };
  nearestBusStops: BusStop[];
  notes: string[];
}

export interface ReportParams {
  lat: number;
  lon: number;
  radiusMiles: number;
  limit: number;
}

export class MiamiDadeGisError extends Error {}

type Attributes = Record<string, unknown>;
type Point = { lat: number; lon: number };
type Unlocated<T> = Omit<T, keyof Located>;
// One school's SchoolSite rows: usually one, more when it has extra campuses (annex, ECC, ...).
type Site = Attributes[];

interface Directory {
  // School location id -> schools with that id (almost always one; see groupSites).
  sites: Map<string, Site[]>;
  // Elementary zone id -> extra school ids that share the zone (TBLOTHERELEMENTARY).
  otherElementary: Map<string, Attributes[]>;
}

let directoryCache: { expires: number; directory: Promise<Directory> } | undefined;

export class MiamiDadeGisClient {
  async getAddressReport({ lat, lon, radiusMiles, limit }: ReportParams): Promise<AddressReport> {
    const point = { lat, lon };
    const [directory, elementary, middle, high, board, charters, privates, daycares, headStarts, clinics, busStops] =
      await Promise.all([
        this.directory(),
        this.containing(LAYERS.elementaryZones, point),
        this.containing(LAYERS.middleZones, point),
        this.containing(LAYERS.highZones, point),
        this.containing(LAYERS.boardDistricts, point),
        this.within(LAYERS.charterSchools, point, radiusMiles),
        this.within(LAYERS.privateSchools, point, radiusMiles, "STATUS IS NULL OR STATUS <> 'Closed'"),
        this.within(LAYERS.daycares, point, radiusMiles),
        this.within(LAYERS.headStarts, point, radiusMiles),
        this.within(LAYERS.clinics, point, radiusMiles),
        this.within(LAYERS.busStops, point, BUS_STOP_RADIUS_MILES),
      ]);

    const publicSchools = nearest(
      [...directory.sites.values()]
        .flat()
        .map((site) => toPublicSchool(site, point))
        .filter((school): school is PublicSchool & Located => (school.distanceMiles ?? Infinity) <= radiusMiles),
      limit,
    );

    return {
      location: point,
      withinMiamiDade: board.length > 0,
      zonedSchools: {
        elementary: zonedSchools(elementary, directory, point, 'E'),
        middle: zonedSchools(middle, directory, point, 'M'),
        high: zonedSchools(high, directory, point, 'S'),
      },
      schoolBoard: board[0] ? { district: str(board[0].ID) ?? '', member: str(board[0].BRDMBR) } : null,
      nearby: {
        radiusMiles,
        publicSchools,
        charterSchools: nearbyList(charters, point, limit, toCharterSchool),
        privateSchools: nearbyList(privates, point, limit, toPrivateSchool),
        daycares: nearbyList(daycares, point, limit, toDaycare),
        headStarts: nearbyList(headStarts, point, limit, toHeadStart),
        clinics: nearbyList(clinics, point, limit, toClinic),
      },
      nearestBusStops: nearbyList(mergeBusStops(busStops), point, BUS_STOP_LIMIT, toBusStop).items,
      notes: NOTES,
    };
  }

  private directory(): Promise<Directory> {
    if (directoryCache && directoryCache.expires > Date.now()) return directoryCache.directory;

    const directory = Promise.all([
      this.query(LAYERS.schoolSites, { where: '1=1' }),
      this.query(LAYERS.otherElementary, { where: '1=1' }),
    ]).then(([sites, others]) => ({
      sites: groupSites(sites),
      otherElementary: groupBy(others, (a) => schoolId(a.ELEMID)),
    }));
    directoryCache = { expires: Date.now() + DIRECTORY_TTL_MS, directory };
    // Don't keep a failed fetch around for the whole TTL.
    directory.catch(() => {
      if (directoryCache?.directory === directory) directoryCache = undefined;
    });
    return directory;
  }

  private containing(layer: string, point: Point): Promise<Attributes[]> {
    return this.query(layer, { ...pointGeometry(point), spatialRel: 'esriSpatialRelIntersects' });
  }

  private within(layer: string, point: Point, miles: number, where = '1=1'): Promise<Attributes[]> {
    return this.query(layer, {
      ...pointGeometry(point),
      where,
      spatialRel: 'esriSpatialRelIntersects',
      distance: String(miles),
      units: 'esriSRUnit_StatuteMile',
    });
  }

  // Follows ArcGIS paging (2,000 records per page) until the layer reports no more.
  private async query(layer: string, params: Record<string, string>): Promise<Attributes[]> {
    const rows: Attributes[] = [];
    for (;;) {
      const url = new URL(`${BASE_URL}/${encodeURIComponent(layer)}/FeatureServer/0/query`);
      const search = { where: '1=1', outFields: '*', returnGeometry: 'false', f: 'json', ...params };
      for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
      if (rows.length) url.searchParams.set('resultOffset', String(rows.length));

      let res: Response;
      try {
        res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch (err) {
        throw new MiamiDadeGisError(`Miami-Dade GIS request to ${layer} failed: ${(err as Error).message}`);
      }
      if (!res.ok) throw new MiamiDadeGisError(`Miami-Dade GIS ${res.status} on ${layer}`);
      // ArcGIS reports query errors with HTTP 200 and an `error` body.
      const body = await res.json();
      if (body.error) {
        throw new MiamiDadeGisError(`Miami-Dade GIS error on ${layer}: ${body.error.message} ${body.error.details ?? ''}`);
      }
      rows.push(...(body.features ?? []).map((f: { attributes: Attributes }) => f.attributes));
      if (!body.exceededTransferLimit) return rows;
    }
  }
}

function pointGeometry({ lat, lon }: Point): Record<string, string> {
  return { geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326' };
}

// Zone features carry the zoned school's id, plus optionally a second school (ID2, and for
// elementary zones the TBLOTHERELEMENTARY table). School details come from the directory.
function zonedSchools(zones: Attributes[], directory: Directory, point: Point, typeCode: string): ZonedSchool[] {
  const schools: ZonedSchool[] = [];
  const seen = new Set<string>();
  const add = (id: string | null, source: Attributes, sharedZone: boolean) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const sites = directory.sites.get(id);
    // Citrus Grove Middle has a zone but no SchoolSite row, so fall back to the source's own fields.
    // Only possible when the source row describes this school (not for a zone's ID2).
    if (!sites && schoolId(source.ID ?? source.ELEMID2) !== id) return;
    const site = sites ? pickSite(sites, source.ADDRESS) : [{ ...source, ID: id, TYPE: typeCode }];
    schools.push({ ...toPublicSchool(site, point, source.ADDRESS), sharedZone });
  };

  for (const zone of zones) {
    const id = schoolId(zone.ID);
    add(id, zone, false);
    add(schoolId(zone.ID2), zone, true);
    if (typeCode === 'E' && id) {
      for (const other of directory.otherElementary.get(id) ?? []) add(schoolId(other.ELEMID2), other, true);
    }
  }
  return schools;
}

// Rows sharing an id are usually campuses of one school, but a few ids cover different schools
// (Ammons Elementary 1-5 and Ammons Middle 6-8), so only merge rows whose grades agree.
// Offices, staff training centers and adult ed are dropped.
function groupSites(rows: Attributes[]): Map<string, Site[]> {
  const sites = new Map<string, Site[]>();
  for (const row of rows) {
    const id = schoolId(row.ID);
    if (!id || NON_K12_TYPES.has(str(row.TYPE) ?? '')) continue;
    const forId = sites.get(id) ?? [];
    const rowGrades = grades(row.GRADES);
    const site = forId.find((s) => {
      const siteGrades = s.map((r) => grades(r.GRADES)).find(Boolean);
      return !rowGrades || !siteGrades || rowGrades === siteGrades;
    });
    if (site) site.push(row);
    else forId.push([row]);
    sites.set(id, forId);
  }
  return sites;
}

// Prefer the school / campus at the zone's street address; otherwise the largest.
function pickSite(sites: Site[], preferAddress?: unknown): Site {
  const wanted = streetNumber(preferAddress);
  return (
    (wanted && sites.find((site) => site.some((r) => streetNumber(r.ADDRESS) === wanted))) ||
    sites.reduce((best, site) => (totalOf(site, 'CAPACITY') ?? 0) > (totalOf(best, 'CAPACITY') ?? 0) ? site : best)
  );
}

function mainCampus(site: Site, preferAddress?: unknown): Attributes {
  const wanted = streetNumber(preferAddress);
  return (
    (wanted && site.find((r) => streetNumber(r.ADDRESS) === wanted)) ||
    site.reduce((best, row) => ((positive(row.CAPACITY) ?? 0) > (positive(best.CAPACITY) ?? 0) ? row : best))
  );
}

// Enrollment is often booked entirely on one campus, so totals are the meaningful numbers.
function toPublicSchool(site: Site, point: Point, preferAddress?: unknown): PublicSchool {
  const main = mainCampus(site, preferAddress);
  const capacity = totalOf(site, 'CAPACITY');
  const enrollment = totalOf(site, 'ENROLLMNT');
  return {
    id: schoolId(main.ID) ?? '',
    name: str(main.NAME) ?? '',
    type: SCHOOL_TYPE_LABELS[str(main.TYPE) ?? ''] ?? 'other',
    grades: grades(main.GRADES) ?? site.map((r) => grades(r.GRADES)).find(Boolean) ?? null,
    address: address(main),
    phone: str(main.PHONE) ?? site.map((r) => str(r.PHONE)).find(Boolean) ?? null,
    email: str(main.EMAIL) ?? site.map((r) => str(r.EMAIL)).find(Boolean) ?? null,
    capacity,
    enrollment,
    utilization: capacity && enrollment !== null ? round(enrollment / capacity) : null,
    otherCampuses: site.filter((r) => r !== main).map((r) => ({ name: str(r.NAME) ?? '', address: address(r) })),
    ...located(main, point),
  };
}

function toCharterSchool(a: Attributes): Unlocated<CharterSchool> {
  return {
    id: schoolId(a.ID) ?? '',
    name: str(a.NAME) ?? '',
    grades: grades(a.GRADE),
    address: address(a),
    phone: str(a.PHONE),
    email: str(a.EMAIL),
    website: str(a.WEBSITE),
    capacity: positive(a.CAPACITY),
    enrollment: num(a.ENROLLMNT),
  };
}

function toPrivateSchool(a: Attributes): Unlocated<PrivateSchool> {
  const year = Number(str(a.YEARESTB));
  return {
    id: str(a.OBJECTID) ?? '',
    name: str(a.NAME) ?? '',
    grades: grades(a.GRDLEVEL),
    address: address(a),
    phone: str(a.PHONE),
    email: str(a.EMAIL),
    website: str(a.WEBSITE),
    enrollment: num(a.ENROLLMENT),
    coed: COED_LABELS[str(a.COED) ?? ''] ?? null,
    yearEstablished: Number.isInteger(year) && year > 1700 ? year : null,
  };
}

function toDaycare(a: Attributes): Unlocated<Daycare> {
  return {
    name: str(a.NAME) ?? '',
    address: address(a),
    phone: str(a.PHONE),
    email: str(a.EMAIL),
    capacity: positive(a.CAPACITY),
    licenseNumber: str(a.LICNUM),
  };
}

function toHeadStart(a: Attributes): Unlocated<HeadStart> {
  return {
    name: str(a.NAME) ?? '',
    program: HEAD_START_PROGRAMS[str(a.TYPE) ?? ''] ?? null,
    address: address(a),
    phone: str(a.PHONE),
    website: str(a.WEBSITE),
  };
}

function toClinic(a: Attributes): Unlocated<Clinic> {
  return { name: str(a.PROVIDER) ?? '', address: address(a) };
}

// The layer has one row per stop per route; merge them so each stop appears once.
function mergeBusStops(rows: Attributes[]): Attributes[] {
  const stops = new Map<string, Attributes & { ROUTEIDS: string[] }>();
  for (const row of rows) {
    const id = str(row.STOPID);
    if (!id) continue;
    const stop = stops.get(id) ?? { ...row, ROUTEIDS: [] };
    const route = str(row.ROUTEID);
    if (route && !stop.ROUTEIDS.includes(route)) stop.ROUTEIDS.push(route);
    stops.set(id, stop);
  }
  return [...stops.values()];
}

function toBusStop(a: Attributes): Unlocated<BusStop> {
  return {
    id: str(a.STOPID) ?? '',
    description: str(a.STOPDESC),
    routeIds: (a.ROUTEIDS as string[] | undefined) ?? [],
  };
}

// Adds distance from the searched point and drops rows without coordinates.
function nearbyList<T>(rows: Attributes[], point: Point, limit: number, convert: (a: Attributes) => T) {
  return nearest(
    rows.flatMap((a) => {
      const location = located(a, point);
      return location ? [{ ...convert(a), ...location }] : [];
    }),
    limit,
  );
}

function nearest<T extends Located>(items: T[], limit: number): NearbyList<T> {
  return { total: items.length, items: [...items].sort((a, b) => a.distanceMiles - b.distanceMiles).slice(0, limit) };
}

function located(a: Attributes, point: Point): Located | undefined {
  const lat = num(a.LAT);
  const lon = num(a.LON);
  if (lat === null || lon === null) return undefined;
  return { lat, lon, distanceMiles: round(haversineMiles(point, { lat, lon })) };
}

function haversineMiles(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

function address(a: Attributes): Address {
  return { street: str(a.ADDRESS), city: str(a.CITY), zip: str(a.ZIPCODE) };
}

// County ids are 4-digit location numbers, stored as either strings ('0961', '   0') or ints (6741).
function schoolId(value: unknown): string | null {
  const id = str(value);
  return id && /^\d+$/.test(id) && Number(id) !== 0 ? id.padStart(4, '0') : null;
}

function streetNumber(value: unknown): string | null {
  return str(value)?.match(/^\d+/)?.[0] ?? null;
}

// Sum of the positive values across campuses; null when none reported.
function totalOf(site: Site, field: string): number | null {
  const values = site.map((r) => positive(r[field])).filter((v): v is number => v !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

// '0' means the site has no students (offices).
function grades(value: unknown): string | null {
  const g = str(value);
  return g && g !== '0' ? g : null;
}

// County strings carry stray whitespace and use '' for missing values.
function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Capacity of 0 means "not reported".
function positive(value: unknown): number | null {
  const n = num(value);
  return n !== null && n > 0 ? n : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupBy(rows: Attributes[], key: (a: Attributes) => string | null): Map<string, Attributes[]> {
  const map = new Map<string, Attributes[]>();
  for (const row of rows) {
    const k = key(row);
    if (k) map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}
