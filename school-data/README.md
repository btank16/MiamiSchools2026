# School data

Raw CSV exports kept as-is. Nothing else in the repo reads these files yet.

## `schools.csv`

All four files below combined into one list of Miami-Dade schools, infant through grade 12 (1,677 rows):
358 public, 180 charter campuses, 949 active private, 86 Head Start and 104 Early Head Start sites.
Offices, adult ed, closed private schools and out-of-state Head Start sites are left out.
Columns: `name, type, level, grades, address, city, zip, phone, website, lat, lon, source, source_id`.
`source` and `source_id` point back to the row in the raw file.

## Raw files

| File | Source | Rows | Notes |
|---|---|---|---|
| `public_schools.csv` | Miami-Dade County GIS `SchoolSite_gdb` | 451 | Every M-DCPS facility. Keep `TYPE` in `E`, `M`, `S`, `ALT`, `SPC` for schools (358 rows). `A` and `PLC` are offices; `O` is adult ed. |
| `charter_schools.csv` | Miami-Dade County GIS `CharterSchool_gdb` | 181 | 6 rows have a blank `ID`. Some schools appear once per campus. |
| `private_schools.csv` | Miami-Dade County GIS `PrivateSchool_gdb` | 971 | Filter `STATUS = Active` (948, plus 1 spelled `Actve`). |
| `head_start_locations_national.csv` | Head Start service locations, nationwide | 19,556 | Filter `county = Miami-Dade County` for 193 Miami-Dade sites (190 open). |

## Coverage check

Checked against the state's 2025-26 school grades (`../SchoolGrades26.xlsx`), which list 473 graded Miami-Dade schools.
Matching on school number, 450 are found in the public or charter file. All 23 that don't match are charter schools.

Found under another number or as a campus of a listed school:
0422 AcadeMir East Middle, 2032 AcadeMir Middle Math and Science, 3036 BridgePrep Village Green MS/HS,
5219 Doral Academy North Elementary, 5412 and 5422 Mater Brickell Middle and High, 5555 and 5556 Mater Biscayne North Miami Middle and High,
6034 Beacon College Prep K-8, 7079 Pinecrest North Prep High.

Possibly renamed (similar name, different number):
5052 and 5057 Mater Lakes Collegiate Academy High and Middle, 7672 AcadeMir Preparatory High.

Not in any file:
0026 Bridge Prep Academy of Miami Gardens, 0402 Somerset Academy Continental, 1019 True North Classical Academy at Pinecrest,
4328 AcadeMir Charter Elementary South, 5038 BridgePrep Academy of Doral MS/HS, 5119 My CA.SA Charter School,
5416 Mater Academy Kiwanis, 5417 Miami Tech at Mater Innovation Academy, 5841 South Prep Scholars Academy Middle,
7078 Somerset College Prep Academy South High.

Also not included here: daycare centers (`Daycare_gdb`, 1,650) and colleges and universities (`College_gdb`, 146).
See `../docs/miami-dade-gis-school-data.md` for those layers.
