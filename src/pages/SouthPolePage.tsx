import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeWindow } from '../lib/astro';
import type { Site } from '../lib/astro';
import { hasMapPosition, missions } from '../lib/missions';
import { hasSiteCoordinates, southPoleSites } from '../lib/sites';
import type { SouthPoleSite } from '../lib/types';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../components/navigator/useNavigatorState';

// South-pole polar view (Phase 4).
//
// The plot is a clean SVG south-polar stereographic projection — no imagery
// tiles: the Trek WMTS source used by the main map publishes an equatorial
// mosaic, and no verified polar tile layer was available to cite, so a
// simple plot is the honest choice (spec allows it). The south pole is the
// centre; rings are latitude, spokes are longitude.

const SIZE = 640;
const CX = SIZE / 2;
const CY = SIZE / 2;
/** Latitude of the plot edge. */
const EDGE_LAT = -80;
/** Pixels per unit of stereographic radius (edge ring maps to R_EDGE). */
const R_EDGE = 280;

function stereoRadiusPx(latitude: number): number {
  // South-polar stereographic: r = 2 * tan((90 + lat) / 2), lat in degrees.
  const theta = ((90 + latitude) * Math.PI) / 180 / 2;
  const r = 2 * Math.tan(theta);
  const rEdge = 2 * Math.tan(((90 + EDGE_LAT) * Math.PI) / 180 / 2);
  return (r / rEdge) * R_EDGE;
}

function project(latitude: number, longitude: number): { x: number; y: number } {
  const r = stereoRadiusPx(latitude);
  const lon = (longitude * Math.PI) / 180;
  return { x: CX + r * Math.sin(lon), y: CY - r * Math.cos(lon) };
}

interface PlotPoint {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  kind: 'candidate' | 'crater' | 'clps';
  siteId: string | null;
}

function fmtCoord(value: number | null, hemi: 'N' | 'S' | 'E' | 'W'): string {
  if (value === null) return '—';
  return `${Math.abs(value).toFixed(1)}° ${value < 0 ? (hemi === 'S' ? 'S' : 'W') : hemi}`;
}

function pct(hours: number, windowHours: number): string {
  return `${((hours / windowHours) * 100).toFixed(1)}%`;
}

export default function SouthPolePage() {
  const [startInput, setStartInput] = useState(() => {
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    return toDatetimeLocalValue(now);
  });
  const windowStart = useMemo(() => {
    const d = fromDatetimeLocalValue(startInput);
    return d ?? new Date();
  }, [startInput]);
  const days = 29.5;
  const windowHours = days * 24;

  // Plot points: Artemis candidates + Shackleton, plus CLPS missions at
  // lat <= -80 (deduplicated by coordinates — three missions share Mons
  // Mouton). Sites without verified coordinates cannot be plotted.
  const points = useMemo<PlotPoint[]>(() => {
    const pts: PlotPoint[] = southPoleSites.filter(hasSiteCoordinates).map((s) => ({
      key: s.id,
      label: s.name,
      latitude: s.latitude!,
      longitude: s.longitude!,
      kind: s.kind === 'crater' ? 'crater' : 'candidate',
      siteId: s.id,
    }));
    const seen = new Set<string>();
    missions
      .filter(hasMapPosition)
      .filter((m) => (m.landingSite?.latitude ?? 0) <= -80)
      .forEach((m) => {
        const key = `${m.landingSite!.latitude},${m.landingSite!.longitude}`;
        if (seen.has(key)) return;
        seen.add(key);
        pts.push({
          key: `clps-${m.id}`,
          label: `${m.landingSite?.name ?? m.name} (${m.name})`,
          latitude: m.landingSite!.latitude!,
          longitude: m.landingSite!.longitude!,
          kind: 'clps',
          siteId: null,
        });
      });
    return pts;
  }, []);

  // Window stats for every computable south-pole site (sub-points are
  // cached and shared across sites in the astro layer).
  const stats = useMemo(() => {
    const rows = southPoleSites
      .filter(hasSiteCoordinates)
      .map((s) => {
        const site: Site = { latitude: s.latitude!, longitude: s.longitude! };
        return { site: s, stats: computeWindow(site, windowStart, days, 30) };
      });
    const bestSun = Math.max(...rows.map((r) => r.stats.sunlitHours), 0);
    const bestEarth = Math.max(...rows.map((r) => r.stats.earthVisibleHours), 0);
    return { rows, bestSun, bestEarth };
  }, [windowStart]);

  const unplotted = southPoleSites.filter((s) => !hasSiteCoordinates(s));
  const ringLats = [-80, -85, -89];
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <section>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">South Pole — Artemis III candidate regions</h1>
        <p className="mt-1 max-w-3xl text-slate-300">
          The lunar south pole is where Artemis III aims to land: permanently shadowed
          craters may hold water ice, while nearby ridges stay in near-constant
          sunlight. Compare the candidate regions for power (sunlight) and
          communication (Earth in view) over one lunar day.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Geometric estimate — ideal flat horizon, terrain not included. Coordinates
          are approximate feature centres.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Polar plot. */}
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <h2 className="mb-2 text-lg font-semibold">Polar view</h2>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="South-polar stereographic plot of Artemis III candidate landing regions and nearby CLPS landing sites. The south pole is at the centre; rings mark 80, 85 and 89 degrees south latitude."
            className="h-auto w-full"
          >
            <rect x={0} y={0} width={SIZE} height={SIZE} rx={8} fill="#05070d" />
            {/* Latitude rings. */}
            {ringLats.map((lat) => (
              <g key={lat}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={stereoRadiusPx(lat)}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                <text
                  x={CX + 4}
                  y={CY - stereoRadiusPx(lat) + 12}
                  fill="#64748b"
                  fontSize={11}
                >
                  {Math.abs(lat)}°S
                </text>
              </g>
            ))}
            {/* Longitude spokes. */}
            {spokes.map((lon) => {
              const end = project(EDGE_LAT, lon);
              const label = project(-78.5, lon);
              return (
                <g key={lon}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={end.x}
                    y2={end.y}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    fill="#64748b"
                    fontSize={11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {lon}°
                  </text>
                </g>
              );
            })}
            {/* Pole marker. */}
            <circle cx={CX} cy={CY} r={4} fill="#e2e8f0" />
            <text x={CX + 8} y={CY + 4} fill="#e2e8f0" fontSize={12}>
              South pole
            </text>
            {/* Sites. */}
            {points.map((p) => {
              const { x, y } = project(p.latitude, p.longitude);
              const outward = { x: x - CX, y: y - CY };
              const len = Math.hypot(outward.x, outward.y) || 1;
              const lx = x + (outward.x / len) * 14;
              const ly = y + (outward.y / len) * 14;
              const fill =
                p.kind === 'candidate' ? '#fbbf24' : p.kind === 'crater' ? '#e2e8f0' : '#38bdf8';
              return (
                <g key={p.key}>
                  <circle cx={x} cy={y} r={6} fill={fill} stroke="#05070d" strokeWidth={1.5}>
                    <title>{`${p.label} — ${fmtCoord(p.latitude, 'S')}, ${fmtCoord(p.longitude, 'E')}`}</title>
                  </circle>
                  <text
                    x={lx}
                    y={ly}
                    fill="#cbd5e1"
                    fontSize={12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#fbbf24]" aria-hidden="true" />
              Artemis III candidate region
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-slate-200" aria-hidden="true" />
              Shackleton crater
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#38bdf8]" aria-hidden="true" />
              CLPS landing site
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Simple SVG polar-stereographic plot (south pole at centre). No imagery
            tiles — the Trek source used by the main map publishes an equatorial
            mosaic. Coordinates are approximate feature centres.
          </p>
          {unplotted.length > 0 && (
            <p className="mt-2 rounded-md border border-signal-warn/30 bg-signal-warn/10 p-3 text-sm text-signal-warn">
              Not plotted — no verified coordinates:{' '}
              {unplotted.map((s) => s.name).join(', ')}. See the sites table below.
            </p>
          )}
        </div>

        {/* Ranked comparison over one lunar day. */}
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <h2 className="mb-2 text-lg font-semibold">Compare over one lunar day (29.5 d)</h2>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-slate-400">Window start (UTC)</span>
            <input
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 tabular-nums"
            />
          </label>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                    Site
                  </th>
                  <th className="border-b border-space-700 p-2 text-right font-medium text-slate-400">
                    Sunlight
                  </th>
                  <th className="border-b border-space-700 p-2 text-right font-medium text-slate-400">
                    Earth visible
                  </th>
                  <th className="border-b border-space-700 p-2 text-right font-medium text-slate-400">
                    Both
                  </th>
                  <th className="border-b border-space-700 p-2 text-right font-medium text-slate-400">
                    Longest dark
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...stats.rows]
                  .sort((a, b) => b.stats.sunlitHours - a.stats.sunlitHours)
                  .map(({ site, stats: st }) => {
                    const bestPower = st.sunlitHours === stats.bestSun && stats.bestSun > 0;
                    const bestComms =
                      st.earthVisibleHours === stats.bestEarth && stats.bestEarth > 0;
                    return (
                      <tr key={site.id}>
                        <td className="border-b border-space-800 p-2 align-top">
                          <Link
                            to={`/navigator?site=${site.id}`}
                            className="font-medium text-slate-100 underline decoration-accent/60 underline-offset-2"
                          >
                            {site.name}
                          </Link>
                          {bestPower && (
                            <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                              Best power
                            </span>
                          )}
                          {bestComms && (
                            <span className="ml-2 rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                              Best comms
                            </span>
                          )}
                        </td>
                        <td
                          className={`border-b border-space-800 p-2 text-right tabular-nums ${
                            bestPower ? 'font-semibold text-amber-300' : 'text-slate-200'
                          }`}
                        >
                          {st.sunlitHours.toFixed(0)} h · {pct(st.sunlitHours, windowHours)}
                        </td>
                        <td
                          className={`border-b border-space-800 p-2 text-right tabular-nums ${
                            bestComms ? 'font-semibold text-sky-300' : 'text-slate-200'
                          }`}
                        >
                          {st.earthVisibleHours.toFixed(0)} h ·{' '}
                          {pct(st.earthVisibleHours, windowHours)}
                        </td>
                        <td className="border-b border-space-800 p-2 text-right tabular-nums text-slate-200">
                          {st.bothHours.toFixed(0)} h
                        </td>
                        <td className="border-b border-space-800 p-2 text-right tabular-nums text-slate-200">
                          {st.longestDarkStretchHours.toFixed(0)} h
                        </td>
                      </tr>
                    );
                  })}
                {unplotted.map((s) => (
                  <tr key={s.id}>
                    <td className="border-b border-space-800 p-2 text-slate-100">{s.name}</td>
                    <td
                      colSpan={4}
                      className="border-b border-space-800 p-2 text-slate-400"
                    >
                      No verified coordinates — excluded from computation.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Sorted by sunlight. “Best power” = most sunlight in the window; “Best
            comms” = most Earth-visible time. Geometric estimate — terrain not
            included. Coordinates are approximate feature centres.
          </p>
        </div>
      </div>

      {/* Sites & sources. */}
      <div className="mt-4 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
        <h2 className="mb-2 text-lg font-semibold">Sites &amp; sources</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                  Site
                </th>
                <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                  Coordinates
                </th>
                <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                  Sources
                </th>
                <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody>
              {southPoleSites.map((s: SouthPoleSite) => (
                <tr key={s.id}>
                  <td className="border-b border-space-800 p-2 align-top">
                    <span className="font-medium text-slate-100">{s.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {s.kind === 'artemis-candidate' ? 'Artemis III candidate' : 'Crater'}
                    </span>
                    {s.notes && (
                      <span className="block text-xs text-slate-400">{s.notes}</span>
                    )}
                  </td>
                  <td className="border-b border-space-800 p-2 align-top tabular-nums text-slate-200">
                    {s.latitude === null
                      ? 'No verified coordinates'
                      : `${fmtCoord(s.latitude, 'S')}, ${fmtCoord(s.longitude, 'E')} (approx.)`}
                  </td>
                  <td className="border-b border-space-800 p-2 align-top">
                    {s.sources.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {s.sources.map((src) => (
                          <li key={src.url}>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent underline"
                            >
                              {src.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="border-b border-space-800 p-2 align-top tabular-nums text-slate-200">
                    {s.lastVerified}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          <Link to="/navigator" className="text-accent underline">
            Open the Sun &amp; Earth Navigator
          </Link>
          {' — pick any site above and watch the Sun and Earth move over a lunar day.'}
        </p>
      </div>
    </section>
  );
}
