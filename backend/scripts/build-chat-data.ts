// Regenerates amplify/functions/chat-api/schools.json from school-data/schools.csv.
// Usage: npm run build:chat-data   (run it whenever schools.csv changes, then commit the JSON)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SCHOOL_TYPES, parseGrades, type School, type SchoolType } from '../amplify/functions/chat-api/schools';

const csvPath = resolve(__dirname, '../../school-data/schools.csv');
const outPath = resolve(__dirname, '../amplify/functions/chat-api/schools.json');

/** RFC 4180 CSV parser: quoted fields, doubled quotes, and newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`schools.csv is missing the "${name}" column`);
  return i;
};
const c = {
  name: col('name'), type: col('type'), level: col('level'), grades: col('grades'), address: col('address'),
  city: col('city'), zip: col('zip'), phone: col('phone'), website: col('website'), lat: col('lat'), lon: col('lon'),
};

const schools: School[] = [];
for (const r of rows) {
  if (r.length < header.length || !r[c.name]) continue;
  const type = r[c.type] as SchoolType;
  if (!SCHOOL_TYPES.includes(type)) throw new Error(`Unknown school type "${r[c.type]}" for ${r[c.name]}`);
  const lat = Number(r[c.lat]);
  const lon = Number(r[c.lon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error(`Bad coordinates for ${r[c.name]}`);
  const span = parseGrades(r[c.grades]);
  schools.push({
    name: r[c.name], type, level: r[c.level], grades: r[c.grades], address: r[c.address], city: r[c.city],
    zip: r[c.zip].slice(0, 5), phone: r[c.phone], website: r[c.website], lat, lon,
    gradeLow: span?.low ?? null, gradeHigh: span?.high ?? null,
  });
}

writeFileSync(outPath, JSON.stringify(schools) + '\n');
const unparsed = schools.filter((s) => s.gradeLow === null && s.grades.trim() !== '');
console.log(`Wrote ${schools.length} schools to ${outPath}`);
if (unparsed.length) console.warn(`Grades not understood for ${unparsed.length}: ${[...new Set(unparsed.map((s) => s.grades))].join(', ')}`);
