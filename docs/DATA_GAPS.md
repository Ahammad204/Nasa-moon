# Known gaps and open items

Things this project knows it does not know. Each entry says what is missing
and what the app does about it instead of guessing.

## Data gaps

- **6 of 15 missions have no landing-site coordinates.** Their sources give
  no coordinates, so they are listed under "No landing site data" and are
  not placed on the map. They still appear in the list, detail pages, and
  compare.
- **11 of 14 south-pole sites have no verified coordinates.** NASA's Aug
  2022 announcement names the 13 Artemis III candidate regions but publishes
  no numeric coordinates for most of them. Those records store
  `latitude: null, longitude: null`, carry their source, and are excluded
  from Sun/Earth computation with an explicit "no verified coordinates"
  note. Only Malapert Massif, Mons Mouton, and Shackleton crater have
  verified coordinates (USGS Gazetteer).
- **Payload counts can disagree with the listed payloads.** A mission's
  `payloadCountReported` (NASA's stated count) sometimes differs from the
  number of payload entries we could document. Both are shown; the
  difference is flagged, not silently resolved.
- **Tile-service terms unconfirmed.** The LRO WAC tiles are served through
  the USGS Trek service; the exact terms of use for that tile endpoint have
  not been confirmed in writing. The mosaic itself is public domain with a
  "please cite authors" request.

## Model limits (Sun & Earth)

- **Geometric ideal horizon only.** Terrain obstruction (crater rims,
  mountains) is NOT modelled — a site in a deep crater will see the Sun
  later and the Earth less than the numbers say. Every computed figure is
  labelled "Geometric estimate — terrain not included."
- **Positions good to about ±0.3°.** The astronomy comes from the
  `astronomy-engine` library (sub-arcminute); the remaining error is the
  documented 0.27° offset in the sub-solar longitude construction (see
  `SUN_EARTH_METHOD.md`). Nothing here is survey-grade.
- **Coordinates are approximate feature centres.** Landing-site positions
  come from the USGS Gazetteer feature centres, not from lander telemetry.

## Repo / deployment gaps

- **NASA Sun glTF is not committed.** `public/models/sun.glb` (4.3 MB,
  NASA 3D Resources) exists only on the developer's local machine; the
  push tooling used for this repo handles text files only, so the binary was
  never committed. The deployed site therefore renders the Sun as an
  emissive sphere + glow sprite (the designed fallback in
  `src/components/navigator/NavigatorScene3D.tsx`). Committing the file
  needs a normal `git push` from a machine that has it.
- **No new screenshots yet.** `docs/screenshots/` still holds only the
  pre-Navigator set (mission list, Moon map, compare on mobile). No
  screenshots of `/navigator`, `/south-pole`, or the compare site-conditions
  section exist yet — this VM cannot capture live-site screenshots.
- **Performance numbers are from 2026-09-29** (before the Navigator, the
  south-pole view, and the compare conditions section). The Lighthouse
  figures in the README predate those features and have not been re-measured.
