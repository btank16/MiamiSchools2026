import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Loads ../school-data/schools.csv and answers the searches the chatbot's tools need.

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CSV_PATH = path.resolve(here, "../../school-data/schools.csv");

export const SCHOOL_TYPES = ["Public", "Charter", "Private", "Head Start", "Early Head Start"] as const;
export type SchoolType = (typeof SCHOOL_TYPES)[number];

export type School = {
  name: string;
  type: SchoolType;
  level: string;
  grades: string;
  address: string;
  city: string;
  zip: string;
  phone: string;
  website: string;
  lat: number;
  lon: number;
  source: string;
  sourceId: string;
  // Parsed grade span, on the scale below. Null when the grades column is blank or unreadable.
  gradeLow: number | null;
  gradeHigh: number | null;
};

// Grade scale: infant/toddler = -2, pre-K = -1, kindergarten = 0, then 1 to 12.
export const INFANT = -2;
export const PREK = -1;
export const KINDERGARTEN = 0;

// --- CSV --------------------------------------------------------------------

/** RFC 4180 CSV parser: quoted fields, doubled quotes, and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// --- Grades -----------------------------------------------------------------

/** Reads one end of a grade range from the CSV ("PK", "KG", "05", "Infant", "PK4"). */
function parseGradeToken(raw: string): number | null {
  const t = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^G(\d)/, "$1"); // "G12" -> "12"
  if (!t) return null;
  if (["INFANT", "INF", "NS", "PG"].includes(t)) return INFANT; // NS = nursery, PG = pre-grade
  if (/^(PK|PREK|VPK)\d?$/.test(t) || t === "K4") return PREK;
  if (t === "K" || t === "KG" || t === "K5" || t === "0" || t === "00") return KINDERGARTEN;
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  return null;
}

/** Parses the grades column into a span, e.g. "PK-05" -> {low: -1, high: 5}. */
export function parseGrades(raw: string): { low: number; high: number } | null {
  const text = raw.trim();
  if (!text) return null;
  // "PK6-12" is a typo for PK-12 in the source data.
  const cleaned = text.replace(/^PK6-/i, "PK-");
  const parts = cleaned.split("-");
  if (parts.length > 2) return null;
  // "18-PK" is an age in months (18 months to pre-K), so it starts at infant care.
  if (parts.length === 2 && /^\d+$/.test(parts[0].trim()) && Number(parts[0]) > 12 && parseGradeToken(parts[1]) === PREK) {
    return { low: INFANT, high: PREK };
  }
  const low = parseGradeToken(parts[0]);
  const high = parts.length === 2 ? parseGradeToken(parts[1]) : low;
  if (low === null || high === null) return null;
  // Some rows are written high-to-low ("05-K"); store them low-to-high.
  return low <= high ? { low, high } : { low: high, high: low };
}

/** Reads a grade the user asked about ("3rd", "kindergarten", "pre-k", "infant", "9"). */
export function parseGradeQuery(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/\s+grade$/, "").replace(/^grade\s+/, "");
  if (/^(infant|infants|baby|babies|toddler|toddlers|daycare|nursery|early head start)$/.test(t)) return INFANT;
  if (/^(pk|pre-?k|vpk|pre-?school|pre-?kindergarten|head start)$/.test(t)) return PREK;
  if (/^(k|kg|kinder|kindergarten)$/.test(t)) return KINDERGARTEN;
  const m = t.match(/^(\d{1,2})(st|nd|rd|th)?$/);
  if (m) {
    const n = Number(m[1]);
    return n >= 1 && n <= 12 ? n : null;
  }
  return null;
}

export function gradeLabel(g: number): string {
  if (g === INFANT) return "infant/toddler";
  if (g === PREK) return "pre-K";
  if (g === KINDERGARTEN) return "kindergarten";
  return `grade ${g}`;
}

// --- Loading ----------------------------------------------------------------

export function loadSchools(csvPath: string = DEFAULT_CSV_PATH): School[] {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
  const header = rows[0];
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`schools.csv is missing the "${name}" column`);
    return i;
  };
  const c = {
    name: col("name"), type: col("type"), level: col("level"), grades: col("grades"),
    address: col("address"), city: col("city"), zip: col("zip"), phone: col("phone"),
    website: col("website"), lat: col("lat"), lon: col("lon"), source: col("source"), sourceId: col("source_id"),
  };
  const schools: School[] = [];
  for (const r of rows.slice(1)) {
    if (r.length < header.length || !r[c.name]) continue;
    const type = r[c.type] as SchoolType;
    if (!SCHOOL_TYPES.includes(type)) continue;
    const span = parseGrades(r[c.grades]);
    schools.push({
      name: r[c.name], type, level: r[c.level], grades: r[c.grades], address: r[c.address],
      city: r[c.city], zip: r[c.zip].slice(0, 5), phone: r[c.phone], website: r[c.website],
      lat: Number(r[c.lat]), lon: Number(r[c.lon]), source: r[c.source], sourceId: r[c.sourceId],
      gradeLow: span?.low ?? null, gradeHigh: span?.high ?? null,
    });
  }
  return schools;
}

// --- Search -----------------------------------------------------------------

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Great-circle distance in miles. */
export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

export type Filters = {
  name?: string;
  types?: SchoolType[];
  city?: string;
  zip?: string;
  grade?: string;
  near?: { zip?: string; school?: string; lat?: number; lon?: number };
  radiusMiles?: number;
};

export type Center = { lat: number; lon: number; description: string };

export class SearchError extends Error {}

function nameMatches(school: School, query: string): boolean {
  const words = normalize(query).split(" ").filter(Boolean);
  const haystack = ` ${normalize(school.name)} `;
  return words.every((w) => haystack.includes(` ${w}`));
}

/** Finds the point a "near" search measures from: a lat/lon, a zip code's center, or a school. */
export function resolveCenter(schools: School[], near: NonNullable<Filters["near"]>): Center {
  if (near.lat !== undefined && near.lon !== undefined) {
    return { lat: near.lat, lon: near.lon, description: `${near.lat.toFixed(4)}, ${near.lon.toFixed(4)}` };
  }
  if (near.zip) {
    const inZip = schools.filter((s) => s.zip === near.zip);
    if (inZip.length === 0) throw new SearchError(`No schools in the data have zip code ${near.zip}, so it can't be used as a center.`);
    const lat = inZip.reduce((a, s) => a + s.lat, 0) / inZip.length;
    const lon = inZip.reduce((a, s) => a + s.lon, 0) / inZip.length;
    return { lat, lon, description: `the center of zip code ${near.zip} (average of its ${inZip.length} schools)` };
  }
  if (near.school) {
    const match = schools.find((s) => normalize(s.name) === normalize(near.school!)) ?? schools.find((s) => nameMatches(s, near.school!));
    if (!match) throw new SearchError(`No school named "${near.school}" was found to search around.`);
    return { lat: match.lat, lon: match.lon, description: `${match.name}, ${match.address}` };
  }
  throw new SearchError("A near search needs a zip code, a school name, or lat and lon.");
}

export function filterSchools(schools: School[], f: Filters): { matches: (School & { distanceMiles?: number })[]; center?: Center; grade?: number } {
  let grade: number | undefined;
  if (f.grade) {
    const g = parseGradeQuery(f.grade);
    if (g === null) throw new SearchError(`"${f.grade}" isn't a grade I understand. Use infant, pre-K, K, or 1 to 12.`);
    grade = g;
  }
  const center = f.near ? resolveCenter(schools, f.near) : undefined;
  const radius = f.radiusMiles ?? (center ? 3 : undefined);
  const city = f.city ? normalize(f.city) : undefined;

  const matches: (School & { distanceMiles?: number })[] = [];
  for (const s of schools) {
    if (f.types?.length && !f.types.includes(s.type)) continue;
    if (f.zip && s.zip !== f.zip) continue;
    if (city && normalize(s.city) !== city) continue;
    if (f.name && !nameMatches(s, f.name)) continue;
    if (grade !== undefined && (s.gradeLow === null || s.gradeHigh === null || grade < s.gradeLow || grade > s.gradeHigh)) continue;
    if (center) {
      const d = distanceMiles(center.lat, center.lon, s.lat, s.lon);
      if (radius !== undefined && d > radius) continue;
      matches.push({ ...s, distanceMiles: d });
    } else {
      matches.push(s);
    }
  }
  if (center) matches.sort((a, b) => a.distanceMiles! - b.distanceMiles!);
  else matches.sort((a, b) => a.name.localeCompare(b.name));
  return { matches, center, grade };
}

/** The fields the model sees for one school. */
export function describe(s: School & { distanceMiles?: number }) {
  return {
    name: s.name,
    type: s.type,
    ...(s.level ? { level: s.level } : {}),
    grades: s.grades || "not listed",
    address: [s.address, s.city, `FL ${s.zip}`].filter(Boolean).join(", "),
    ...(s.phone ? { phone: s.phone } : {}),
    ...(s.website ? { website: s.website } : {}),
    ...(s.distanceMiles !== undefined ? { distance_miles: Math.round(s.distanceMiles * 10) / 10 } : {}),
  };
}

export function countBy(list: School[], key: "type" | "city" | "zip"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of list) {
    const k = s[key] || "(blank)";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}
