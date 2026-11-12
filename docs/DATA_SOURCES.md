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
