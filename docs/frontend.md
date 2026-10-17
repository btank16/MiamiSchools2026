# Frontend guide

How the School Navigator frontend works, the decisions behind it, and what must survive when branches are merged. Read this before merging or rewriting anything in `frontend/`.

## Run it

```bash
cd frontend && npm ci && npm run dev      # http://127.0.0.1:5173
npm run build                              # type check + production build; must pass before merging
```

| Setting | Where | What it does |
|---|---|---|
| `VITE_API_URL` | `frontend/.env.local` | Empty = the deployed API in `amplify_outputs.json`. `http://localhost:3001` = a local backend (`npm run dev` in `backend/`). |
| Google photos | none in `frontend/` | School photos and Street View load through the schools API (`/places/<id>/photos/<ref>`, `/streetview`), so they follow `VITE_API_URL`: the deployed API uses the `googlemap` Amplify secret, a local backend uses `GOOGLE_MAPS_API_KEY` in `backend/.env`. The key never reaches the browser. |
| `VITE_MAPBOX_TOKEN` | `frontend/.env.local` | Not used today. The map runs on MapLibre with the keyless OpenFreeMap style. |

Stack: Vite 8, React 19, TypeScript, Tailwind 4, shadcn/ui (base-nova, built on `@base-ui/react`), lucide-react, react-map-gl with maplibre-gl 6, turf.

## What the page does

1. **On load it shows every place** (2,738 from `src/data/places.json`), in the list and on the map. No address is needed. This is deliberate: **never gate the list behind a search.**
2. **Searching an address** (Google autocomplete in the navbar) fetches GreatSchools and Miami-Dade County data through the backend and replaces the list with the places near that address: zoned schools first, distance on every card, a search circle on the map.
3. **Filters and Sort** work in both modes and narrow the list and the map together.
4. **A card, pin or popup opens a school page** with photos, facts, contact details and every field each source returned.

## Files

| File | Responsibility |
|---|---|
| `src/App.tsx` | State: view, filters, sort, open school, search. Picks `directory` (no address) or the search result as the base list, then filters and sorts it. |
| `src/components/clone/data.ts` | The `Place` model, `directory` (built from `places.json`), `buildPlaces()` (merges GreatSchools and county results), grade normalization. |
| `src/components/clone/filters.ts` | Filter types, matching rules, grade/level maps, distance options, `SORTS` and `sortPlaces`. **All filter logic lives here.** |
| `src/components/clone/FilterBar.tsx` | The dropdowns and the List / Split / Map switch. |
| `src/components/clone/ResultsPanel.tsx` | The list: directory view before a search, results view after. Notices for loading and errors. |
| `src/components/clone/ListingCard.tsx` | Card components, photo carousel, badges. |
| `src/components/clone/MapPanel.tsx` | The map, pins, clusters, popup, search circle. |
| `src/components/clone/PlacePopup.tsx` | Popup when a pin is clicked. |
| `src/components/clone/SchoolPage.tsx` | The school detail page. |
| `src/lib/api.ts`, `useSchoolSearch.ts` | Calls to the schools API and the search flow. Types come from `backend/amplify/functions/schools-api/`, so they cannot drift. |
| `src/lib/photos.ts`, `public/photos/`, `src/data/photo-index.json` | Photo lookup. Each school is matched to a Google photo list by name and location. |
| `colors.md` (repo root) | The color system. Tokens are in `src/index.css`. |

### Data files are generated

`src/data/places.json`, `src/data/photo-index.json` and `public/photos/*.json` are **generated outside this repo** from the merged school list and the photo scrape. Do not hand-edit them. If they conflict in a merge, take the newer generated version of the whole file rather than merging line by line.

## The `Place` model and "no address"

`Place` has fields that only exist after a search: `distanceMiles`, `zoned`, `ratingBand`, `summary`, `greatSchoolsUrl`. In directory mode they are `null` or empty (`distanceMiles: null`, `zoned: []`).

Rules that follow from that:

- Anything that prints a distance must check `distanceMiles != null`.
- `SchoolPage` takes `origin: Origin | null` and must work without one.
- The Distance filter and "Sort by distance" are **disabled until an address is searched**, because there is nothing to measure from. Do not bring back a fixed stand-in point such as downtown Miami; it was removed on purpose.

## Filters

All filters are in `filters.ts`. Within one filter, any picked value matches (Public **or** Charter). Between filters, all must match. Nothing picked means no restriction.

| Filter | Values | Notes |
|---|---|---|
| **Level** | Infant & toddler, Pre-K, Elementary, Middle, High | What kind of school. Derived from the grade range, so a PK–8 school counts as Pre-K, Elementary and Middle. |
| **Type** | Public, Charter, Private, Childcare, Head Start | The place's kind. These exact words are `PlaceType`. |
| **Grades** | Pre-K, Kindergarten, 1 to 12 | Plain numbers. Only offers grades inside the chosen Level(s); picking a grade also turns on its Level; disabled for Infant & toddler only. This prevents "Elementary + Grade 12". |
| **Distance** | 1, 2, 5, 10, 15 miles | From the searched address. Sized to Miami-Dade, which is about 45 miles north to south, so 25 or 50 miles would match nearly everything. |
| **Sort by** | Default, Distance, Rating, Name | Distance is disabled without an address. |

The summary text on a filter button shows what was picked ("Elementary", "Grades 3, 4"), never a count.

### Placeholders and removed controls

| Control | State |
|---|---|
| **Cost** | **Removed on purpose.** We have no tuition or price data for any place, so the filter cannot work. If a branch re-adds `const pills = ['Programs', 'Cost']`, drop `'Cost'` when merging. |
| Programs | Placeholder, no behavior. |
| Highest rated | Placeholder, no behavior. Only some places have a rating. |
| More | Placeholder, no behavior. |
| Save search | Icon-only button, no behavior. There are no accounts. |

The agreed next filters, when the data is ready: state grade (A to F), program offerings (magnet, AP, IB, dual enrollment, gifted), and childcare facts (takes infants, VPK, before/after care, meals, accreditation).

## The map

- Pins are map layers, not DOM markers, so thousands stay fast. MapLibre cannot find its worker under Vite on its own: `vite.config.ts` excludes `maplibre-gl` from dependency pre-bundling, and `MapPanel.tsx` sets the worker URL in production. Do not remove either.
- Basemap: `STYLE` in `MapPanel.tsx` (OpenFreeMap), also used by the school page map.
- **Every place is one dot**: brand blue `#2256BB`, white ring, soft shadow, size grows with zoom. The selected place is a larger dark dot with a halo. The **zoned school is a gold dot** (`#F7BE2B`) on its own source, so it never merges and always shows. Gold is reserved for "your zoned school" (see `colors.md`).
- **"Group nearby" switch** (off by default) merges close dots into numbered circles that split as you zoom. Grouping is fixed when a map source is created, so there are two sources: `places-flat` (default, layer `place-single`) and `places` (clustered). Each mode's layers are shown with `visibility`. If you change dot styling, change the shared paint objects (`dotPaint`, `dotShadow`, `dotHalo`) so both modes stay identical.
- Clicking a dot opens `PlacePopup`. Clicking a numbered circle zooms in.

### Rejected designs, do not bring back

- **Word pills** ("Public", "Charter" on every pin). The same word repeated about 40 times told you nothing and covered the map.
- **Per-type colors, shapes and a legend.** One color means one thing: a place. Type lives in the card, popup and filters.
- **Numbered circles as the default view.** They are available behind "Group nearby" only.

## Cards

Cards in one row must be the same height with their buttons on the same line. The card is a flex column, the body is `flex-1`, and the footer row has `mt-auto`. Keep that when editing `ListingCard.tsx`; cards that size to their own text misalign as soon as one has a longer name or a rating line.

## Search results

`buildPlaces()` merges GreatSchools and county records. The county record wins on name, location and enrollment; GreatSchools adds rating, summary and anything the county left blank. Matching is by state id first, then name plus a short distance. Source errors are shown as notices and the other source's results still appear.

The address summary panel (school board district, bus stops, health clinics, "results capped" notes) was **removed from the results list** in this change to keep the list clean. The data is still fetched in `useSchoolSearch` and available on `result.report`, so it can come back as its own section.

## Merge checklist

Before merging a branch into this one, check these, which are the places branches most often disagree:

1. `FilterBar.tsx`: `pills` has no `Cost`. Distance and Sort stay disabled without an address.
2. `MapPanel.tsx`: both sources exist, default view shows every place (`place-single`), the zoned dot is on the `zoned` source, no per-type colors or legend.
3. `ResultsPanel.tsx`: the directory list shows with no search; searching adds a notice, it never replaces the list.
4. `data.ts`: `distanceMiles` is `number | null`.
5. `ListingCard.tsx`: equal-height cards.
6. `vite.config.ts`: the `maplibre-gl` exclusion is present, and no `/gphoto` or `/gsv` proxy has come back (photos go through the schools API).
7. Generated data files are taken whole, not merged by line.
8. `npm run build` passes, and with no address typed you can see the list, the dots and the popup.

## Verifying a change

1. `npm run build` passes.
2. Load the page with no search: the list shows 2,738 places and the map shows dots.
3. Click a dot: the popup opens, and View details opens the school page and back works.
4. Level, Type, Grades each narrow the list and the dots; Distance is disabled.
5. Search an address (needs the backend and keys): results sort by distance, zoned schools come first and are gold on the map, and Distance becomes usable.
