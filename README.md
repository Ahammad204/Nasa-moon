# CLPS Lunar Mission Browser

Explore and compare NASA **CLPS** (Commercial Lunar Payload Services) lunar missions: every
delivery, its lander and provider, landing site on an interactive Moon map, payloads, status,
and sources — plus a **Sun & Earth Site Navigator** that computes Sun and Earth
position, illumination, and communication windows for any landing site and date — built
as a static React app over verified NASA/USGS data.

> Independent educational project for NASA Space Apps Challenge 2026 (Bangladesh).
> Not affiliated with or endorsed by NASA.

**Live:** https://clps-agent-kit.vercel.app

## Screenshots

| Mission list | Moon map | Compare (mobile) |
|---|---|---|
| ![Mission list](docs/screenshots/list-desktop.png) | ![Moon map](docs/screenshots/map-desktop.png) | ![Compare at 375px](docs/screenshots/compare-mobile.png) |

## Features

- **Mission list** with free-text search (name, lander, provider, site, payloads) and filters
  (status, provider, launch year, region) — AND across filters, OR within one
- **Mission detail** at `/mission/:id`: full record, payloads, objective, outcome, notes,
  and every fact linked to its source
- **Moon map**: NASA LRO WAC tiles (Trek, `L.CRS.EPSG4326`), one marker per mission with
  coordinates; missions without coordinates are honestly listed as "no landing site data"
- **Compare** 2–3 missions side by side (stacked cards on mobile) with differing fields shaded
- **Sun & Earth Navigator** at `/navigator`: pick a site and a UTC date/time, see Sun/Earth
  elevation and azimuth, time to sunset and Earthset, a 3D scene with the real Sun direction
  driving the terminator, a horizon diagram, and an illumination timeline — state lives in
  the query string (`?site=…&t=…&days=…`)
- **South Pole** at `/south-pole`: the 13 NASA Artemis III candidate regions plus Shackleton
  crater on a polar view, with Sun/Earth conditions per site
- **Compare site conditions**: the Compare page adds sunlight hours, Earth-visible hours,
  hours with both, and longest dark/sunlit stretches per site, ranked by power and comms
  potential — labelled "Geometric estimate — terrain not included"
- **Payload explorer**: browse payloads and see which missions carried them
- **Charts** by status and provider that respond to the active filters
- **Research Library** at `/library`: every conclusion the app states, one sentence each, with its source badge and the page where the fact is used — searchable and filterable by source type
- **Why the South Pole?** at `/why-south-pole`: the six-step story of lunar water (1961–2023), what it means for landing, and the NASA water video (click-to-load)
- **Hazard briefings**: static charging and dust, fresh impacts, thermal extremes and radiation context on mission-detail, Navigator and south-pole pages, with computed longest-dark and sunlit values per site
- **Moon Lab** at `/moon-lab`: your weight on the Moon (slider 1–150 kg), Earth–Moon signal delay, and a Moon-at-a-glance constants table — plus a compact teaser on the landing page
- **Shareable URLs**: search, filters, compare set and map selection all live in the query string

## Setup

```bash
npm install
npm run dev        # local dev server
npm run build      # production build (tsc --noEmit && vite build)
npm run preview    # serve the production build
npm run lint       # ESLint
npm run typecheck  # TypeScript strict
npm test           # Vitest (data validation + pure-function tests)
```

Note for this machine: the shell sets `NODE_ENV=production`, which makes npm skip
devDependencies. Clear it first — bash: `unset NODE_ENV` · cmd.exe: `set "NODE_ENV="` ·
PowerShell: `$env:NODE_ENV=$null`. Then run npm as usual.

## Stack

Vite + React 18 + TypeScript (strict) + Tailwind CSS · react-leaflet + Leaflet (Moon map,
lazy-loaded chunk) · Recharts (charts, lazy-loaded chunk) · Three.js + GLTFLoader (Navigator
3D scene, lazy-loaded chunk; NASA Sun glTF) · `astronomy-engine` (Sun/Moon ephemeris and
libration for the Sun & Earth model) · Vitest · `react-router-dom`.
Static site: all data bundled as `src/data/missions.json` and `src/data/sites.json`, no backend.

**Science Context data layer** (three layers, strictly separated): data in
`src/data/sources.json`, `src/data/moon-constants.json`,
`src/data/water-timeline.json`, `src/data/hazards.json` and
`src/data/conclusions.json` (every record carries `sources` and
`lastVerified`; unknown = `null`); pure engine functions in `src/lib/physics/`
(weight, light time) and `src/lib/astro/`; React components only render data
+ engine output. No number reaches the UI except through the data layer or
engine, with its source attached. Research sources are listed in
`src/data/sources.json` (NASA Science pages, NASA SVS, USGS Gazetteer,
Washington University in St. Louis, The Open University) and shown in the app
via the Research Library at `/library`.

## Data and sources

15 CLPS deliveries, 50 payload entries (47 distinct names). Every record carries `sources`
and `lastVerified`; unknown values are `null`, never guesses. Full source table:
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md); open gaps and source conflicts:
[`docs/DATA_GAPS.md`](docs/DATA_GAPS.md); schema: [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md);
Sun & Earth method: [`docs/SUN_EARTH_METHOD.md`](docs/SUN_EARTH_METHOD.md).

- **South-pole sites**: 14 sites in `src/data/sites.json` — the 13 NASA Artemis III
  candidate regions (Aug 2022) plus Shackleton crater. Only 3 have verified coordinates
  (Malapert Massif, Mons Mouton, Shackleton); the other 11 are `null` with sources and an
  explicit "no verified coordinates" note.

- **Mission data**: NASA Science, "CLPS Deliveries" and its per-delivery pages (science.nasa.gov)
- **Coordinates**: USGS Gazetteer of Planetary Nomenclature (planetarynames.wr.usgs.gov) —
  feature centers, so all map positions are flagged approximate
- **Basemap**: NASA/LRO/LROC Team (Arizona State University) WAC global morphology mosaic,
  published by USGS Astrogeology Science Center — public domain, please cite authors

## Credits

Basemap: NASA/LRO/LROC Team (Arizona State University) WAC global morphology mosaic,
published by USGS Astrogeology Science Center — public domain, please cite authors.
Mission data: NASA Science, "CLPS Deliveries" (science.nasa.gov).
Lander details: mission provider pages (Astrobotic, Intuitive Machines, Firefly, …).
Sun & Earth positions: `astronomy-engine` npm package (MIT) — Sun/Moon ephemeris and
libration; method in [`docs/SUN_EARTH_METHOD.md`](docs/SUN_EARTH_METHOD.md).
Sun 3D model: NASA 3D Resources (solarsystem.nasa.gov); Moon 3D model: NASA Solar System
Exploration, "Earth's Moon" — public domain.
Science Context sources: NASA Science Moon pages (Facts, Moon Water and Ices, Solar Wind,
Composition, Why Study Lunar Craters?), NASA Scientific Visualization Studio (Tour of the
Moon, SVS 3874), NASA water video (YouTube), USGS Gazetteer of Planetary Nomenclature,
Washington University in St. Louis (Apollo sample photos, credit Randy Korotev), The Open
University Virtual Microscope (Apollo 17). Full list with links: `src/data/sources.json`
and the Research Library at `/library`.

## License

- **Data and imagery**: NASA content is generally not subject to copyright in the United States
  for non-commercial use (NASA media guidelines); the WAC mosaic is public domain with a
  "please cite authors" request (USGS Astrogeology record). Attribution is displayed in the app
  footer. Tile-service terms are still unconfirmed and tracked in `docs/DATA_GAPS.md`.
- **Code**: MIT — see [`LICENSE`](LICENSE). Educational geometric model. Independent
  project, not affiliated with or endorsed by NASA.

## Measured performance (Lighthouse, production build, 2026-09-29)

| Page | Performance | Accessibility | Best Practices |
|---|---|---|---|
| Home | 99 | 100 | 100 |
| Map | 87 | 96 | 96 |

Targets (NFR-3) are 85 / 90 / 90 — both pages beat them. Map-page limits come from external
NASA tile loading and Leaflet's generated controls.

## Repository layout

```
src/            app (pages, components, lib pure functions, data/missions.json + sites.json)
src/data/       sources.json, moon-constants.json, water-timeline.json, hazards.json, conclusions.json
src/lib/physics/  weight + light-time engine (pure, tested)
docs/           screenshots, DATA_SOURCES.md, DATA_GAPS.md, DATA_SCHEMA.md, SUN_EARTH_METHOD.md
public/models/  Moon + Sun 3D models (Sun glTF not committed — see docs/DATA_GAPS.md)
```
