# Miami-Dade County GIS — school data inventory

Every school-related dataset the county publishes, as checked on 2026-10-17.
All are public ArcGIS REST feature services: no API key, no auth.

**Base URL:** `https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/<Service>/FeatureServer/0`

Query with `/query` (`where`, `outFields`, `geometry`, `spatialRel`, `returnGeometry`, `f=json|geojson|pbf`).
All layers: max 2,000 records per request, pagination supported (`resultOffset` / `resultRecordCount`).
Pass `inSR=4326` / `outSR=4326` to work in lat/lon.

## Using it from our backend

`GET /address/report?lat=&lon=[&radius=2&limit=10]` (schools-api Lambda, `backend/amplify/functions/schools-api/miamidade.ts`)
returns everything below for one point in a single call (~1–1.5 s):

- `zonedSchools.elementary | middle | high`: zoned school(s), joined to `SchoolSite` for capacity,
  enrollment, utilization and distance. `sharedZone: true` marks a second school serving the same zone.
  Multi-campus schools are merged (totals across campuses, other campuses in `otherCampuses`).
- `schoolBoard`: district number and board member.
- `nearby.*`: public, charter, private (active only), daycares, Head Start, clinics within `radius`
  miles (0.25–5), nearest `limit` (1–50) of each plus a `total`.
- `nearestBusStops`: nearest 3 M-DCPS stops within 0.5 mi, one entry per stop with all its routes.
- `withinMiamiDade`: false when the point is outside the county (everything else comes back empty).

Get `lat`/`lon` from the existing `/places/{placeId}` route. The public school directory is cached
in the Lambda for an hour; everything else is queried live.

## Summary

| Dataset | Service | Geometry | Records | Data last edited | County says it updates |
|---|---|---|---|---|---|
| Public schools (M-DCPS) | `SchoolSite_gdb` | point | 451 | 2025-11-19 | Quarterly |
| Charter schools | `CharterSchool_gdb` | point | 181 | 2025-11-24 | — |
| Private schools | `PrivateSchool_gdb` | point | 971 | 2026-10-15 | Annually |
| Colleges & universities | `College_gdb` | point | 146 | 2026-01-21 | Annually |
| Elementary attendance zones | `ElementaryAttendanceBoundary_gdb` | polygon | 216 | 2026-09-21 | — |
| Middle attendance zones | `MiddleAttendanceBoundary_gdb` | polygon | 53 | 2026-09-21 | — |
| High attendance zones | `HighAttendanceBoundary_gdb` | polygon | 34 | 2026-09-21 | — |
| Shared elementary zones | `TBLOTHERELEMENTARY` | table | 3 | 2019-02-21 | — |
| Pre-K attendance zones | `PreKAttendanceBoundary_gdb` | polygon | **0 (empty)** | 2023-04-21 | — |
| Daycare centers (DCF) | `Daycare_gdb` | point | 1,650 | 2026-10-15 | Quarterly |
| Head Start / Early Head Start | `HeadStart_gdb` | point | 109 | 2025-11-24 | Annually |
| M-DCPS school bus stops | `MDCPSBusStop_gdb` | point | 38,882 | **2018-11-13** | — |
| School-based health clinics | `SchoolBasedClinic_gdb` | point | 168 | **2018-11-13** | — |
| School Board districts | `SchoolBoardDistrict_gdb` | polygon | 9 | 2022-07-07 | — |
| School Board districts (2000) | `SchoolBoardDistrict2000_gdb` | polygon | 9 | 2019-02-01 | — |
| School impact fee districts | `SchoolImpactFeeDistrict_gdb` | polygon | 3 | 2018-11-13 | — |
| School / daycare property parcels | `SexPred_Prop2` | polygon | 5,314 | 2026-07-01 | — |
| 2,500 ft school buffer | `Buffer of SexPred_Prop2` | polygon | 1 | 2026-07-01 | — |
| 1,000 ft daycare buffer | `1,000 Ft Buffer - Daycare2` | polygon | 1 | 2026-07-01 | — |
| Tracts with >28.4% no HS diploma | `CTs_NotHSGrad_GT28pt4pct` | polygon | 103 | 2020-03-13 | — |

Not useful / do not use: `tblYouthCommission` (27 names of 2020 student commissioners),
`EEL_Program_School_Volunteer_View` (volunteer sign-ups; see [Privacy](#privacy)),
`MD_SchoolBoardBuffer` on `gisweb.miamidade.gov` (a copy of the `SchoolSite` points).

---

## Schools

### Public schools — `SchoolSite_gdb`

Every M-DCPS facility, including admin buildings and adult-ed centers (filter on `TYPE`).

| Field | Type | Notes |
|---|---|---|
| `ID` | string | 4-digit M-DCPS location number. **Join key to attendance zones.** |
| `NAME`, `CAMPUS` | string | |
| `ADDRESS`, `UNIT`, `CITY`, `ZIPCODE` | string / int | |
| `PHONE`, `EMAIL` | string | |
| `TYPE` | string | See codes below |
| `GRADES` | string | e.g. `PK-5`, `6-8`, `9-12`, `PK-8`. `0` = no students (offices) |
| `CAPACITY` | int | Seats |
| `ENROLLMNT` | int | Enrollment → utilization = `ENROLLMNT / CAPACITY` |
| `REGION` | string | `N`, `C`, `S`, `AC` |
| `FOLIO` | string | Property Appraiser parcel id |
| `LAT`, `LON` | double | WGS84 |
| `CREATEDDATE`, `MODIFIEDDATE` | date (epoch ms) | |

`TYPE` codes (no official definitions published; inferred from records):

| Code | Count | Meaning |
|---|---|---|
| `E` | 228 | Elementary / K-8 |
| `M` | 49 | Middle |
| `S` | 65 | Senior high |
| `ALT` | 8 | Alternative / opportunity schools |
| `SPC` | 8 | Special ed / early-childhood centers |
| `O` | 30 | Adult education & technical colleges |
| `PLC` | 22 | Professional learning centers (no students) |
| `A` | 37 | Administrative buildings (no students) |
| `U` | 1 | Unclassified |

For a "schools" view, keep `TYPE IN ('E','M','S','ALT','SPC')`.

### Charter schools — `CharterSchool_gdb`

Same core fields as public schools, plus:

| Field | Notes |
|---|---|
| `ID` | 4-digit M-DCPS location number |
| `GRADE` | (singular) e.g. `K-5`, `K-8`, `9-12`, `6-12` |
| `CAPACITY` | Often `0` (not reported) |
| `ENROLLMNT` | |
| `WEBSITE` | |

No `TYPE` or `REGION`. Charters have no attendance zones.

### Private schools — `PrivateSchool_gdb`

| Field | Notes |
|---|---|
| `NAME`, address fields, `PHONE`, `EMAIL`, `WEBSITE` | |
| `DIRCTNAME` | Director / head of school name |
| `YEARESTB` | Year established (string) |
| `GRDLEVEL` | e.g. `PK-12` |
| `ENROLLMENT` | (spelled out, unlike the public layer) |
| `COED` | `C` co-ed (890), `B` boys (11), `G` girls (6); a few `Y`/`N`/blank |
| `TYPE` | `Y` (191) / `N` (307) / blank (226). Undocumented; `Y` rows are mostly religiously affiliated — verify before showing |
| `STREGFLG` | `Y`/`N`/blank. Undocumented; likely "registered with the state" |
| `CHLDCAREID` | Child-care license id when the school also runs child care |
| `STATUS` | `Active` (948), `Closed` (6). **Filter to `Active`** (one row is misspelled `Actve`) |
| `LAT`, `LON` | |

No `ID` / capacity. Values have stray leading spaces; trim everything.

### Colleges & universities — `College_gdb`

`NAME`, `CAMPUS`, address fields, `PHONE`, `WEBSITE`, `LAT`, `LON`,
`TYPE` (`C` college, `U` university, `T` technical), `CAPACITY` + `CAP_DESC` (what the number means, e.g. "Enrollment").

---

## Attendance zones

### Elementary / Middle / High — `{Elementary,Middle,High}AttendanceBoundary_gdb`

One polygon per zoned school. A point-in-polygon query returns the zoned school:

```
GET .../ElementaryAttendanceBoundary_gdb/FeatureServer/0/query
  ?geometry=<lon>,<lat>&geometryType=esriGeometryPoint&inSR=4326
  &spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json
```

| Field | Notes |
|---|---|
| `ID` | School location number. **String in Elementary/High, integer in Middle** |
| `ID2` | Second school sharing the zone (`0` / blank = none) |
| `NAME`, `DISPLAYNAME` | `DISPLAYNAME` is the short label (sometimes blank) |
| `ADDRESS`, `CITY`, `ZIPCODE`, `PHONE` | School's address, not the zone's |
| `GRADES` | Grades served by the zoned school |
| `REGION` | Elementary uses `I`–`VI`, `ET`; Middle/High use `N`/`C`/`S` |
| `FLAG` | Elementary only; blank on every row |

**Joining to school details:** normalize `ID` (trim, zero-pad to 4 digits) and match `SchoolSite_gdb.ID`.
Tested: 216/216 elementary, 34/34 high, 52/53 middle match. The miss is
Citrus Grove Middle (`6091`), which has a zone but no `SchoolSite` record.
The join is what gives a zoned school its capacity, enrollment and email.

### Shared zones — `TBLOTHERELEMENTARY`

3 rows. When an elementary zone feeds two schools, this table lists the
second one (`ELEMID` → `ELEMID2`, plus name / address / grades). Check it after the
elementary lookup so you can show both schools.

### Pre-K — `PreKAttendanceBoundary_gdb`

Schema exists, **0 features**. Not usable.

---

## Early childhood

### Daycare — `Daycare_gdb` (from Dept. of Children & Families)

`NAME`, address fields, `CONTACT`, `PHONE`, `EMAIL`, `CAPACITY`, `LICNUM` (DCF license),
`LICDATE` / `LICEXP` (license issue / expiry, epoch ms), `DACRID`, `DCOUNSELOR`, `LAT`, `LON`.
`LICEXP` can be years old (sample: 2019), so don't present it as current license status.

### Head Start — `HeadStart_gdb`

`NAME`, address fields, `PHONE`, `WEBSITE`, `LAT`, `LON`,
`TYPE` (`DA` delegate agency 50, `GA` grantee agency 35, `EHS` Early Head Start 24), `EARLYHS` (`Y`/`N`).
Low-income eligibility programs.

---

## Transportation & services

### School bus stops — `MDCPSBusStop_gdb` (**stale: 2018**)

`STOPID`, `STOPDESC` (address + notes, e.g. effective date), `LOCATION`, `ROUTEID`, `LAT`, `LON`.
38,882 stops; 3,245 have no route. No link to a school. Only usable for
"nearest school bus stop", and with a staleness warning.

### School-based health clinics — `SchoolBasedClinic_gdb` (**stale: 2018**)

`PROVIDER` (the school's name), `ADDRESS`, `CITY`, `ZIPCODE`, `LAT`, `LON`. No school `ID`;
match to schools by name or distance.

---

## Governance & districts

| Service | Fields | Use |
|---|---|---|
| `SchoolBoardDistrict_gdb` | `ID` (1–9), `BRDMBR` (board member name) | "Your School Board member" by point-in-polygon. Member names last edited 2022; verify |
| `SchoolBoardDistrict2000_gdb` | same | Historical; ignore |
| `SchoolImpactFeeDistrict_gdb` | `ID` (1–3) | Developer impact fees; niche |

---

## Property & buffers

### `SexPred_Prop2` — parcel polygons for schools, daycares, parks and pools

Built for the sex-offender residency rules, but it is the only source of **campus outlines**.
`LAYER` says what each row is: `MDC.SchoolSite` (135), `MDC.CharterSchool` (88),
`MDC.PrivateSchool` (284), `MDC.DayCare` (1,575), `MDC.MunicipalPark` (463),
`MDC.PublicSwimmingPool` (2,769). Also `NAME`, `ADDRESS`, `FOLIO`.
Coverage is partial (135 of 451 public sites), so treat it as optional map polish.

### Buffers

`Buffer of SexPred_Prop2` (2,500 ft around all schools) and `1,000 Ft Buffer - Daycare2`
are each a single dissolved polygon. Only useful as a map overlay.

---

## Context

### `CTs_NotHSGrad_GT28pt4pct`

103 census tracts (2010 geography) where >28.4% of adults lack a HS diploma; `Pct_NotHSG`.
Pre-filtered, so tracts below the threshold are missing. Use Census ACS directly if you need every tract.

---

## Gaps (not in county GIS)

The county data has **no** test scores, school grades (A–F), ratings, demographics,
magnet / choice programs, bell times, or feeder patterns beyond what the zones imply.
Those need M-DCPS, the Florida DOE, or GreatSchools (already wired up in
`backend/amplify/functions/schools-api/greatschools.ts`). To join with GreatSchools, match
on name + distance. A shared id may be possible if the M-DCPS `ID` lines up with the
state school number GreatSchools uses; that is unverified.

## Data-quality notes

- Strings have stray whitespace (`'   0'`, `' N'`); trim all values.
- Dates are epoch milliseconds.
- `ID` types differ between layers (string vs int); always normalize.
- Field names differ for the same concept: `GRADES` / `GRADE` / `GRDLEVEL`,
  `ENROLLMNT` / `ENROLLMENT`.
- Code meanings (`TYPE`, `STREGFLG`, …) are not documented in the county metadata;
  the meanings above are inferred from the records.

## Privacy

`EEL_Program_School_Volunteer_View` is publicly queryable and its schema includes
volunteer full names, phone numbers, emails, emergency contacts, and for students
their school name and grade (2,206 records). We did not read any of its values. Don't use it.
Consider reporting it to the county GIS team: https://gisweb.miamidade.gov/giscontactus
