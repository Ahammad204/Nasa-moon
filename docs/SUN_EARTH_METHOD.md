# Sun & Earth method

How the Sun & Earth Site Navigator (`/navigator`, `src/lib/astro/`)
computes Sun and Earth positions for a lunar landing site. The code is the
authority; this document summarises it in one place for the judges.

## Principle

For a site at selenographic latitude φ and longitude λ, and a body whose
sub-point (the point on the Moon where the body is directly overhead) is
(φb, λb):

```
elevation = asin( sinφ·sinφb + cosφ·cosφb·cos(λ − λb) )
azimuth   = atan2( sin(λ − λb),
                  cosφ·tan(φb) − sinφ·cos(λ − λb) ) + 180°, normalised 0–360°
```

Azimuth is clockwise from true north (0° = north, 90° = east, 180° = south,
270° = west). The +180° converts the south-based hour-angle formula to a
north-based azimuth; it is verified by the Apollo 11 test (the Sun stood
low in the east at landing).

## Where the sub-points come from

No hand-rolled ephemeris: every geocentric position comes from the
`astronomy-engine` npm package (MIT, pure JS, sub-arcminute accuracy).

- **Sub-Earth point:** `Astronomy.Libration(date)` returns (elat, elon),
  the selenographic latitude/longitude of the point facing the centre of
  the Earth — Meeus, "Astronomical Algorithms" ch. 53 (optical + physical
  libration).
- **Sub-solar point:** Meeus ch. 53's construction, applied to the Sun.
  With I = 1.54242° (inclination of the lunar equator to the ecliptic),
  Ω the mean longitude of the Moon's ascending node, and (λ, β) the Sun's
  apparent geocentric ecliptic longitude/latitude (from
  `astronomy-engine`'s `GeoVector`, rotated J2000 equatorial → ecliptic):
  - `w = λ − Ω`, `a = atan2( sin w·cos β·cos I − sin β·sin I, cos w·cos β )`
    is the Sun's angle in the lunar equatorial plane from the node.
  - The prime meridian points at the mean Earth, whose angle `aE` in the
    same plane is computed identically from the mean Earth's ecliptic
    longitude (mean Moon longitude + 180°).
  - `l0 = a − aE` (selenographic longitude of the Sun),
    `b0 = asin( sin w·cos β·sin I + sin β·cos I )` (latitude).

## Events and windows

- **Rise/set search** (`src/lib/astro/events.ts`): scan forward in
  30-minute steps (default horizon 40 days), then refine the first sign
  change by bisection to about 1-minute precision. Returns `null` when no
  crossing happens in the window — a real answer, not a failure: the Earth
  never sets on the near side, and the Sun can stay up for months at the
  poles.
- **Window statistics** (`src/lib/astro/window.ts`): samples Sun/Earth
  elevation every 30 minutes over the chosen window (default one lunar day,
  29.5 d) and totals sunlit hours, Earth-visible hours, hours with both up
  (the powered-and-communicating state), longest sunlit stretch, and
  longest dark stretch. Sub-points are computed once per time step and
  shared across sites; results are cached (bounded, 64 entries).
- **Sun-disc mode:** the Sun's apparent semi-diameter as seen from the Moon
  is ~0.27°, so the upper limb's elevation is centre + 0.27°. When the
  toggle is on, "Sun up" is judged by the upper limb.

## Validation (physical sanity checks, `src/lib/astro/astro.test.ts`)

- Sub-solar longitude advances ~360° over one synodic month (29.53 d).
- Sub-Earth point reproduces Meeus Example 53.a (1992-04-12: l = −1.23,
  b = +4.20) exactly.
- Sub-solar point on 1992-04-12: this implementation gives l0 = 68.17,
  b0 = +1.47 vs Meeus's 67.90 / +1.46 — the 0.27° longitude offset is the
  known difference between the bare mean longitude used for the prime
  meridian and Meeus's fuller theory. It is documented, not hidden.
- Apollo 11 landing (1969-07-20 20:17 UTC, 0.674° N, 23.473° E): Sun
  elevation ~10–15°, low in the east.
- Near-side equatorial site (0°, 0°): Earth elevation near 90° (minus
  libration), essentially always visible.
- Far-side site (0°, 180°): Earth-visible hours = 0 over any window.
- South-pole sites (~−89.5°): Sun elevation stays within about ±2° of the
  horizon all year (axial tilt ~1.54°).

## Limits — read before quoting numbers

- **Geometric ideal horizon.** Terrain obstruction (crater rims, mountains)
  is NOT included. A site inside a deep crater sees the Sun later and the
  Earth less than the numbers say.
- **Positions good to about ±0.3°.** Nothing here is survey-grade.
- **Coordinates are approximate feature centres** (USGS Gazetteer), not
  lander telemetry.
- All computed figures are labelled in the UI as "Geometric estimate —
  terrain not included."
