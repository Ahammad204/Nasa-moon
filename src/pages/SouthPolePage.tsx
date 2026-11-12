import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeWindow } from '../lib/astro';
import type { Site } from '../lib/astro';
import { hasMapPosition, missions } from '../lib/missions';
import { hasSiteCoordinates, southPoleSites } from '../lib/sites';
import HazardBriefing from '../components/HazardBriefing';
import QuickMapButton from '../components/QuickMapButton';
import type { SouthPoleSite } from '../lib/types';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../components/navigator/useNavigatorState';

// South-pole page — redesigned for a quick, friendly read.
//
// Same data and honesty rules as Phase 4 (nothing invented: only 3 of the
// 14 regions have verified coordinates), but presented as cards instead of
// walls of tables: a hero with the key facts, winner cards, a polar plot,
// one scannable card per site, and sources tucked into a <details> block.
// Mobile-first: everything stacks, tap targets stay >= 44px.

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
  return `${((hours / windowHours) * 100).toFixed(0)}%`;
}

/** Labelled meter bar — the number is always printed, colour is never the only signal. */
function Meter({
  label,
  icon,
  hours,
  windowHours,
  barClass,
  textClass,
}: {
  label: string;
  icon: string;
  hours: number;
  windowHours: number;
  barClass: string;
  textClass: string;
}) {
  const p = Math.min(100, Math.max(0, (hours / windowHours) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-300">
          <span aria-hidden="true">{icon} </span>
          {label}
        </span>
        <span className={`font-semibold tabular-nums ${textClass}`}>
          {hours.toFixed(0)} h · {pct(hours, windowHours)}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-space-800"
        role="img"
        aria-label={`${label}: ${hours.toFixed(0)} hours out of ${windowHours.toFixed(0)}, ${pct(hours, windowHours)}`}
      >
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-space-950 px-2 py-1.5 text-center">
      <div className="text-sm font-semibold tabular-nums text-slate-100">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
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
      })
      .sort((a, b) => b.stats.sunlitHours - a.stats.sunlitHours);
    const bestSun = Math.max(...rows.map((r) => r.stats.sunlitHours), 0);
    const bestEarth = Math.max(...rows.map((r) => r.stats.earthVisibleHours), 0);
    const bestPower = rows.find((r) => r.stats.sunlitHours === bestSun && bestSun > 0);
    const bestComms = rows.find(
      (r) => r.stats.earthVisibleHours === bestEarth && bestEarth > 0,
    );
    return { rows, bestSun, bestEarth, bestPower, bestComms };
  }, [windowStart]);

  const unplotted = southPoleSites.filter((s) => !hasSiteCoordinates(s));
  const ringLats = [-80, -85, -89];
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <section>
      {/* Hero — the whole page in one glance. */}
      <header className="mb-5 overflow-hidden rounded-xl border border-space-800 bg-gradient-to-b from-space-900 to-space-950 p-5 shadow-panel sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
          🌙 Artemis III · Lunar south pole
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Where should the next astronauts land?
        </h1>
        <p className="mt-2 max-w-2xl text-base text-slate-300">
          Shadowed craters near the pole may hold water ice, while nearby ridges
          stay in near-constant sunlight. Compare the candidate regions for the
          two things a lander needs most — <span className="text-amber-300">power</span>{' '}
          and <span className="text-sky-300">communication</span> — over one lunar day.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-slate-200">
            🗺️ 14 candidate regions
          </span>
          <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-slate-200">
            📍 3 with verified coordinates
          </span>
          <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-slate-200">
            ☀️ 1 lunar day = 29.5 days
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/navigator"
            className="inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-5 text-sm font-medium text-white hover:bg-accent/70"
          >
            Open the Sun &amp; Earth Navigator →
          </Link>
          <a
            href="#rankings"
            className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-5 text-sm text-slate-200 hover:bg-space-900"
          >
            See the rankings ↓
          </a>
        </div>
      </header>

      {/* Why here? — three friendly reasons. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="text-2xl" aria-hidden="true">
            🧊
          </div>
          <h2 className="mt-1 font-semibold text-slate-100">Water ice</h2>
          <p className="mt-1 text-sm text-slate-300">
            Permanently shadowed craters never see the Sun — ice may survive there.
          </p>
        </div>
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="text-2xl" aria-hidden="true">
            ☀️
          </div>
          <h2 className="mt-1 font-semibold text-slate-100">Near-constant sunlight</h2>
          <p className="mt-1 text-sm text-slate-300">
            Ridges near the pole catch the low Sun almost all lunar day — power
            for a lander.
          </p>
        </div>
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="text-2xl" aria-hidden="true">
            📡
          </div>
          <h2 className="mt-1 font-semibold text-slate-100">Earth in view</h2>
          <p className="mt-1 text-sm text-slate-300">
            From the near side, Earth hangs almost still in the sky — a direct
            line home.
          </p>
        </div>
      </div>

      {/* Winners — the two answers at a glance. */}
      {stats.bestPower && stats.bestComms && (
        <div id="rankings" className="mb-5 grid gap-3 sm:grid-cols-2">
          <Link
            to={`/navigator?site=${stats.bestPower.site.id}`}
            className="block rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 shadow-panel hover:bg-amber-400/15"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
              ☀️ Best power
            </p>
            <p className="mt-1 text-xl font-bold text-slate-100">
              {stats.bestPower.site.name}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-semibold tabular-nums text-amber-300">
                {stats.bestPower.stats.sunlitHours.toFixed(0)} h of sunlight
              </span>{' '}
              out of {windowHours.toFixed(0)} h (
              {pct(stats.bestPower.stats.sunlitHours, windowHours)} of the lunar
              day)
            </p>
            <p className="mt-2 text-sm font-medium text-amber-300">
              Open in Navigator →
            </p>
          </Link>
          <Link
            to={`/navigator?site=${stats.bestComms.site.id}`}
            className="block rounded-lg border border-sky-400/40 bg-sky-400/10 p-4 shadow-panel hover:bg-sky-400/15"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
              📡 Best comms
            </p>
            <p className="mt-1 text-xl font-bold text-slate-100">
              {stats.bestComms.site.name}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-semibold tabular-nums text-sky-300">
                {stats.bestComms.stats.earthVisibleHours.toFixed(0)} h with Earth
                in view
              </span>{' '}
              out of {windowHours.toFixed(0)} h (
              {pct(stats.bestComms.stats.earthVisibleHours, windowHours)} of the
              lunar day)
            </p>
            <p className="mt-2 text-sm font-medium text-sky-300">
              Open in Navigator →
            </p>
          </Link>
        </div>
      )}

      {/* Polar plot + window control. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <h2 className="text-lg font-semibold">🗺️ Polar view</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            South pole at the centre · rings are latitude · spokes are longitude
          </p>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="South-polar stereographic plot of Artemis III candidate landing regions and nearby CLPS landing sites. The south pole is at the centre; rings mark 80, 85 and 89 degrees south latitude."
            className="mt-2 h-auto w-full"
          >
            <rect x={0} y={0} width={SIZE} height={SIZE} rx={8} fill="#05070d" />
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
            <circle cx={CX} cy={CY} r={4} fill="#e2e8f0" />
            <text x={CX + 8} y={CY + 4} fill="#e2e8f0" fontSize={12}>
              South pole
            </text>
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
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-300">
              ● Artemis III candidate
            </span>
            <span className="rounded-full bg-slate-400/15 px-2.5 py-1 text-slate-200">
              ● Shackleton crater
            </span>
            <span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-sky-300">
              ● CLPS landing site
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Simple SVG polar plot — no imagery tiles (the Trek source used by the
            main map publishes an equatorial mosaic). Coordinates are approximate
            feature centres.
          </p>
        </div>

        {/* Window control + what the numbers mean. */}
        <div className="space-y-4">
          <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
            <h2 className="font-semibold">📅 Pick a lunar day</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Rankings below cover 29.5 days from this start.
            </p>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-slate-400">Window start (UTC)</span>
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 tabular-nums"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                now.setUTCMinutes(0, 0, 0);
                setStartInput(toDatetimeLocalValue(now));
              }}
              className="mt-2 min-h-[44px] rounded-md border border-space-700 px-4 text-sm text-slate-200 hover:bg-space-900"
            >
              Now
            </button>
          </div>
          <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
            <h2 className="font-semibold">How to read this page</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              <li>
                <span className="text-amber-300">☀️ Sunlight</span> — hours the Sun
                is up. More sun = more solar power.
              </li>
              <li>
                <span className="text-sky-300">📡 Earth visible</span> — hours
                Earth is above the horizon. More = longer direct contact home.
              </li>
              <li>
                <span className="text-emerald-300">✅ Both</span> — hours with Sun
                AND Earth up: powered and talking at once.
              </li>
              <li>
                <span className="text-slate-100">🌑 Longest dark</span> — the
                longest stretch without Sun. Batteries must survive this.
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Geometric estimate — ideal flat horizon, terrain not included.
            </p>
          </div>
        </div>
      </div>

      {/* One card per computable site. */}
      <h2 className="mb-3 mt-6 text-xl font-bold">🏆 Rankings — one lunar day</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.rows.map(({ site, stats: st }, i) => {
          const bestPower = st.sunlitHours === stats.bestSun && stats.bestSun > 0;
          const bestComms =
            st.earthVisibleHours === stats.bestEarth && stats.bestEarth > 0;
          return (
            <article
              key={site.id}
              className="flex flex-col rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    #{i + 1} · {site.kind === 'crater' ? 'Crater' : 'Artemis III candidate'}
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold leading-snug text-slate-100">
                    {site.name}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-space-950 px-2 py-1 text-xs tabular-nums text-slate-300">
                  {fmtCoord(site.latitude, 'S')}, {fmtCoord(site.longitude, 'E')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {bestPower && (
                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                    ☀️ Best power
                  </span>
                )}
                {bestComms && (
                  <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                    📡 Best comms
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-3">
                <Meter
                  label="Sunlight"
                  icon="☀️"
                  hours={st.sunlitHours}
                  windowHours={windowHours}
                  barClass="bg-amber-400"
                  textClass="text-amber-300"
                />
                <Meter
                  label="Earth visible"
                  icon="📡"
                  hours={st.earthVisibleHours}
                  windowHours={windowHours}
                  barClass="bg-sky-400"
                  textClass="text-sky-300"
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat label="Both up" value={`${st.bothHours.toFixed(0)} h`} />
                <MiniStat
                  label="Longest dark"
                  value={`${st.longestDarkStretchHours.toFixed(0)} h`}
                />
                <MiniStat
                  label="Longest sunlit"
                  value={`${st.longestSunlitStretchHours.toFixed(0)} h`}
                />
              </div>
              <Link
                to={`/navigator?site=${site.id}`}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-md border border-accent/60 bg-accent-dim/40 px-4 text-sm font-medium text-accent hover:bg-accent-dim/60"
              >
                Open in Navigator →
              </Link>
              {site.latitude != null && site.longitude != null && (
                <div className="mt-2">
                  <QuickMapButton
                    latitude={site.latitude}
                    longitude={site.longitude}
                    label={site.name}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Sites without verified coordinates — honest, compact, not a wall. */}
      {unplotted.length > 0 && (
        <div className="mt-6 rounded-lg border border-signal-warn/30 bg-signal-warn/10 p-4">
          <h2 className="font-semibold text-signal-warn">
            ⏳ {unplotted.length} regions waiting for verified coordinates
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            NASA named these regions but published no numeric coordinates for
            them, so they cannot be plotted or ranked yet — no numbers are
            guessed here. When NASA publishes coordinates, they will appear
            above automatically.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unplotted.map((s) => (
              <span
                key={s.id}
                className="rounded-full border border-signal-warn/30 bg-space-950 px-3 py-1.5 text-sm text-slate-200"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hazards at the pole itself (Shackleton crater, the deepest point). */}
      <div className="mt-6">
        <HazardBriefing site={{ latitude: -89.67, longitude: 129.78 }} siteName="Shackleton crater" />
      </div>

      {/* Sources — tucked away, still complete. */}
      <details className="mt-6 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
        <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-slate-100">
          📚 Sources &amp; verification ({southPoleSites.length} sites)
        </summary>
        <ul className="mt-3 space-y-2 text-sm">
          {southPoleSites.map((s: SouthPoleSite) => (
            <li key={s.id} className="border-b border-space-800 pb-2 last:border-0">
              <span className="font-medium text-slate-100">{s.name}</span>{' '}
              <span className="text-slate-400">
                —{' '}
                {s.latitude === null
                  ? 'no verified coordinates'
                  : `${fmtCoord(s.latitude, 'S')}, ${fmtCoord(s.longitude, 'E')} (approx.)`}
                {' · '}verified {s.lastVerified}
              </span>
              {s.sources.length > 0 && (
                <span className="ml-1">
                  {s.sources.map((src) => (
                    <a
                      key={src.url}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-2 text-accent underline"
                    >
                      {src.label} ↗
                    </a>
                  ))}
                </span>
              )}
              {s.notes && <span className="block text-xs text-slate-400">{s.notes}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <Link to="/navigator" className="text-accent underline">
            Open the Sun &amp; Earth Navigator
          </Link>
          {' — pick any site above and watch the Sun and Earth move over a lunar day.'}{' '}
          <Link to="/why-south-pole" className="text-accent underline">
            Why the south pole? Read the story →
          </Link>
        </p>
      </details>
    </section>
  );
}
