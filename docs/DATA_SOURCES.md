# Data sources

Every record in this project carries its own `sources` (label + URL + date
accessed) and `lastVerified` date. Unknown values are `null`, never guesses.
This file is the project-level index; the per-record lists in
`src/data/missions.json` and `src/data/sites.json` are authoritative.

| Data | Source | Used for |
|---|---|---|
| Mission records (15 CLPS deliveries) | NASA Science, "CLPS Deliveries" and its per-delivery pages (science.nasa.gov) | Mission name, provider, lander, dates, status, objective, outcome |
| Landing-site coordinates | USGS Gazetteer of Planetary Nomenclature (planetarynames.wr.usgs.gov) | Latitude/longitude of landing sites — feature centres, so all map positions are flagged approximate |
| Moon basemap tiles | NASA/LRO/LROC Team (Arizona State University) WAC global morphology mosaic, published by USGS Astrogeology Science Center | Leaflet map tiles on `/map` — public domain, please cite authors |
| Moon 3D model | NASA Solar System Exploration, "Earth's Moon" (solarsystem.nasa.gov) | Textured Moon sphere in the 3D scenes — public domain |
| Sun 3D model | NASA 3D Resources, Sun model (solarsystem.nasa.gov) | Sun object in the Navigator 3D scene (`public/models/sun.glb`) — see `DATA_GAPS.md`: the file is not committed to the repo, so the deployed site uses the emissive-sphere fallback |
| South-pole sites (14) | NASA, "NASA Identifies Candidate Regions for Landing Next Americans on Moon" (Aug 2022, 13 Artemis III candidate regions) + USGS Gazetteer for the three regions with published coordinates (Malapert Massif, Mons Mouton, Shackleton crater) | `src/data/sites.json` — per-site sources are listed on each record |
| Sun/Moon positions | `astronomy-engine` npm package (MIT, pure JS, sub-arcminute accuracy) | Sub-Earth point (`Astronomy.Libration`) and geocentric Sun/Moon vectors behind the Sun & Earth model — see `SUN_EARTH_METHOD.md` |
| Lander details | Mission provider pages (Astrobotic, Intuitive Machines, Firefly, …) | Lander names and details not covered by the NASA pages |

## Verification habit

- Coordinates are cross-checked against the USGS Gazetteer entry for the
  named feature where one exists; a coordinate with no citable source is
  stored as `null` and the site is excluded from computation (see
  `DATA_GAPS.md`).
- `src/lib/validate.test.ts` checks every record: required fields, valid
  coordinates, at least one source per record, unique ids.
- The Sun & Earth model is validated against Meeus, "Astronomical
  Algorithms" Example 53.a and the Apollo 11 landing geometry — see
  `SUN_EARTH_METHOD.md` and `src/lib/astro/astro.test.ts`.

## Lunar Feature Explorer dataset (`src/data/lunar-features.json`)

- **File downloaded:** `MOON_nomenclature_center_pts.zip` (23,845,070 bytes),
  from <https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.zip>
  (the current Moon nomenclature shapefile linked from the USGS GIS
  Downloads page, <https://planetarynames.wr.usgs.gov/GIS_Downloads>).
  **Downloaded 2026-11-13.** The archive's `.dbf` was last modified
  2026-11-12 09:04 UTC; it holds 9,087 approved IAU feature names, all
  "Adopted by IAU".
- **Build:** `node scripts/build-features.mjs` (no dependencies; parses the
  ZIP + `.dbf` in plain Node, `--input <local .zip>` reuses a download).
  Only the `.dbf` attribute table is read — the `.shp` geometry is the
  same centre point the `.dbf` already carries as `center_lat` /
  `center_lon`.
- **Coordinates:** Gazetteer longitude is 0–360° east; the JSON stores
  east-positive −180…180 (values > 180 shifted by −360). Latitude −90…90.
  Lat/lon rounded to 4 decimals, diameter to 3.
- **Counts (2026-11-13 download):** 9,087 total — Crater 1,635; Other
  7,152; Valley 126; Mountain 114; Maria 59; Plain 1. "Other" is large
  because 7,064 records are Satellite Features (lettered satellite
  craters) and 81 are astronaut-named features — neither type is in the
  spec's category mapping, so per the no-guessing rule they stay "Other"
  with their raw type kept rather than being reclassified. 4 records have
  a published diameter of 0 (Planitia Descensus, Mons Agnes, Statio Shiv
  Shakti, Statio Tianjiang) — stored as `diameterKm: null`.
- **Size:** 3,297,067 bytes (~3.2 MB). Do NOT statically import it on a
  route — the UI phase must lazy-load it via dynamic import.
- **Feature ids:** parsed from the Gazetteer's `link` field
  (`https://planetarynames.wr.usgs.gov/Feature/<id>`, verified HTTP 200);
  `featureType` is the raw 2-letter Gazetteer code (`AA` = crater, …),
  `typeName` the descriptive type string.
- **Types present in this download:** Crater, Catena, Mare, Lacus, Palus,
  Sinus, Oceanus, Mons, Promontorium, Dorsum, Rupes, Vallis, Rima,
  Planitia, Satellite Feature, Astronaut-named features, Albedo Feature,
  Statio. Fossa, Planum, Lingula and Terra do NOT occur for the Moon.
