import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeWindow, getSunEarthState } from '../lib/astro';
import type { Site, WindowSample } from '../lib/astro';
import { useMotionPrefs } from '../lib/motionPrefs';
import { hasWebGL } from '../lib/webgl';
import HorizonDiagram from '../components/navigator/HorizonDiagram';
import SunEarthCards, { type NextEventInfo } from '../components/navigator/SunEarthCards';
import { nextEventFromSamples } from '../components/navigator/eventFromSamples';
import { fmtUtc } from '../components/navigator/format';
import {
  DAY_LABELS,
  NAVIGATOR_DAYS,
  fromDatetimeLocalValue,
  navigatorSiteOptions,
  toDatetimeLocalValue,
  useNavigatorState,
  type NavigatorDays,
} from '../components/navigator/useNavigatorState';

// Lazy: Three.js + Recharts stay out of the entry bundle; they load only
// when this route renders (same pattern as the app's SpaceCanvas / MapPage).
const NavigatorScene3D = lazy(() => import('../components/navigator/NavigatorScene3D'));
const NavigatorTimeline = lazy(() => import('../components/navigator/NavigatorTimeline'));

const PLAY_SPEEDS = [
  { hoursPerSecond: 1, label: '1 h/s' },
  { hoursPerSecond: 6, label: '6 h/s' },
  { hoursPerSecond: 24, label: '1 day/s' },
];

function pickNextEvent(
  samples: WindowSample[],
  from: Date,
  body: 'sun' | 'earth',
  site: Site,
  sunDisc: boolean,
): NextEventInfo {
  const set = nextEventFromSamples(samples, from, body, 'set', site, sunDisc);
  const rise = nextEventFromSamples(samples, from, body, 'rise', site, sunDisc);
  if (set === null && rise === null) return { at: null, kind: null };
  if (set !== null && rise !== null) {
    return set.getTime() <= rise.getTime()
      ? { at: set, kind: 'set' }
      : { at: rise, kind: 'rise' };
  }
  return set !== null ? { at: set, kind: 'set' } : { at: rise, kind: 'rise' };
}

function SceneSkeleton() {
  return (
    <div
      className="flex h-full items-center justify-center text-sm text-slate-400"
      role="status"
      aria-live="polite"
    >
      Loading 3D scene…
    </div>
  );
}

export default function NavigatorPage() {
  const { state, update } = useNavigatorState();
  const { reduced } = useMotionPrefs();
  const [webgl] = useState(() => hasWebGL());
  const [tab, setTab] = useState<'scene' | 'horizon' | 'timeline'>('scene');
  const [view, setView] = useState<'orbit' | 'surface'>('orbit');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6);
  const [copied, setCopied] = useState(false);

  const { site, windowStart, days, sunDisc, current, offsetHours, windowHours } = state;

  // Window stats depend on the window (start + length), never on the
  // playhead — scrubbing the slider stays cheap (cached in the astro layer).
  const stats = useMemo(
    () => computeWindow(site, windowStart, days, 30, sunDisc),
    [site, windowStart, days, sunDisc],
  );
  const currentState = useMemo(
    () => getSunEarthState(site, current, sunDisc),
    [site, current, sunDisc],
  );
  const nextSun = useMemo(
    () => pickNextEvent(stats.samples, current, 'sun', site, sunDisc),
    [stats, current, site, sunDisc],
  );
  const nextEarth = useMemo(
    () => pickNextEvent(stats.samples, current, 'earth', site, sunDisc),
    [stats, current, site, sunDisc],
  );
  const lookAzimuth = currentState.sun.up
    ? currentState.sun.azimuth
    : currentState.earth.azimuth;

  // Playhead: advance `speed` hours per second; stop at the window end.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const next = offsetHours + speed * 0.25;
      if (next >= windowHours) {
        update({ offsetHours: windowHours });
        setPlaying(false);
      } else {
        update({ offsetHours: next });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, speed, offsetHours, windowHours, update]);

  // Changing the window or site resets the playhead and pauses.
  const onSiteChange = (id: string) => {
    setPlaying(false);
    update({ siteId: id });
  };
  const onWindowStartChange = (value: string) => {
    const d = fromDatetimeLocalValue(value);
    if (d === null) return;
    setPlaying(false);
    update({ windowStart: d });
  };
  const onDaysChange = (d: NavigatorDays) => {
    setPlaying(false);
    update({ days: d, offsetHours: Math.min(offsetHours, d * 24) });
  };
  const onNow = () => {
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    setPlaying(false);
    update({ windowStart: now, offsetHours: 0 });
  };
  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard API unavailable (permissions) — fall back to a selection.
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // Nothing more to try; the URL bar still holds the shareable link.
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const tabButton = (key: 'scene' | 'horizon' | 'timeline', label: string) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-medium ${
        tab === key ? 'bg-accent-dim text-white' : 'text-slate-300 hover:bg-space-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <section>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Sun &amp; Earth Navigator</h1>
        <p className="mt-1 max-w-3xl text-slate-300">
          Pick a landing site and a date — see the Sun and Earth from the surface, and
          how much power and communication time the site gets. Built for the NASA Space
          Apps Challenge 2026, “Lunar Landing Site Navigator”.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Geometric estimate — ideal flat horizon, terrain not included. Positions good
          to about ±0.3°. Coordinates are approximate feature centres.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* Controls — left on desktop, sticky bar at the bottom on mobile. */}
        <div className="order-3 lg:order-1">
          <div className="sticky bottom-0 z-20 space-y-4 rounded-lg border border-space-800 bg-space-950/95 p-4 shadow-panel backdrop-blur-md lg:static lg:bg-space-900 lg:backdrop-blur-none">
            <h2 className="text-sm font-medium text-slate-300">Controls</h2>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Landing site</span>
              <select
                value={site.id}
                onChange={(e) => onSiteChange(e.target.value)}
                className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-slate-100"
              >
                {navigatorSiteOptions().map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} — {o.siteName} ({o.latitude.toFixed(1)}°, {o.longitude.toFixed(1)}°)
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Window start (UTC)</span>
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(windowStart)}
                onChange={(e) => onWindowStartChange(e.target.value)}
                className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 tabular-nums"
              />
            </label>
            <button
              type="button"
              onClick={onNow}
              className="min-h-[44px] rounded-md border border-space-700 px-4 text-sm text-slate-200 hover:bg-space-900"
            >
              Now
            </button>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Window length</span>
              <select
                value={days}
                onChange={(e) => onDaysChange(Number(e.target.value) as NavigatorDays)}
                className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-slate-100"
              >
                {NAVIGATOR_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <label htmlFor="nav-time" className="mb-1 block text-sm text-slate-400">
                Time in window ·{' '}
                <span className="tabular-nums text-slate-200">{fmtUtc(current)}</span>
              </label>
              <input
                id="nav-time"
                type="range"
                min={0}
                max={windowHours}
                step={0.5}
                value={offsetHours}
                onChange={(e) => update({ offsetHours: Number(e.target.value) })}
                className="w-full accent-[#38bdf8]"
                aria-label="Time within window, in hours from the window start"
              />
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-pressed={playing}
                  aria-label={playing ? 'Pause time' : 'Play time'}
                  className="min-h-[44px] min-w-[44px] rounded-md bg-accent-dim px-4 text-sm font-medium text-white hover:bg-accent/70"
                >
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <span className="text-slate-400">Speed</span>
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="min-h-[44px] flex-1 rounded-md border border-space-700 bg-space-950 px-2 text-slate-100"
                    aria-label="Playback speed"
                  >
                    {PLAY_SPEEDS.map((s) => (
                      <option key={s.hoursPerSecond} value={s.hoursPerSecond}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={sunDisc}
                onChange={(e) => update({ sunDisc: e.target.checked })}
                className="h-4 w-4"
              />
              Sun-disc mode (sunrise/sunset by the Sun&apos;s upper limb, +0.27°)
            </label>

            <button
              type="button"
              onClick={onCopyLink}
              className="min-h-[44px] w-full rounded-md border border-space-700 px-4 text-sm text-slate-200 hover:bg-space-900"
            >
              {copied ? '✓ Link copied' : 'Copy shareable link'}
            </button>
            <p className="text-xs text-slate-400">
              Site, date, window and Sun-disc mode live in the URL — share it and the
              same view opens.
            </p>
          </div>
        </div>

        {/* Centre: 3D scene, horizon diagram, timeline. */}
        <div className="order-1 space-y-4 lg:order-2">
          <div
            role="tablist"
            aria-label="Navigator views"
            className="flex gap-1 rounded-lg border border-space-800 bg-space-900 p-1 lg:hidden"
          >
            {tabButton('scene', '3D')}
            {tabButton('horizon', 'Horizon')}
            {tabButton('timeline', 'Timeline')}
          </div>

          <div className={tab === 'scene' ? 'block' : 'hidden lg:block'}>
            <div className="relative h-[40vh] min-h-[320px] overflow-hidden rounded-lg border border-space-800 bg-space-950 shadow-panel lg:h-[56vh]">
              {webgl ? (
                <Suspense fallback={<SceneSkeleton />}>
                  <NavigatorScene3D
                    site={site}
                    timeMs={current.getTime()}
                    view={view}
                    lookAzimuthDeg={lookAzimuth}
                    reducedMotion={reduced}
                  />
                </Suspense>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <p className="font-medium text-slate-200">3D scene unavailable</p>
                  <p className="text-sm text-slate-400">
                    WebGL is not available in this browser, so the 3D scene is off. The
                    horizon diagram and timeline below show the same Sun and Earth
                    positions.
                  </p>
                </div>
              )}
              {webgl && (
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView(view === 'orbit' ? 'surface' : 'orbit')}
                    aria-pressed={view === 'surface'}
                    className="min-h-[44px] rounded-md border border-space-700/70 bg-space-950/80 px-3 text-sm text-slate-200 backdrop-blur-md hover:bg-space-800"
                  >
                    {view === 'orbit' ? 'Surface view' : 'Orbit view'}
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {view === 'surface'
                ? `Surface view — standing at ${site.siteName}, looking across the ground toward the horizon at the ${currentState.sun.up ? 'Sun' : 'Earth'}’s azimuth. Drag is disabled here; switch back to orbit to rotate.`
                : 'Orbit view — drag to rotate, scroll to zoom. The pin marks the site; the terminator follows the real Sun direction.'}
            </p>
          </div>

          <div className={tab === 'horizon' ? 'block' : 'hidden lg:block'}>
            <HorizonDiagram
              site={site}
              date={current}
              sun={{ azimuth: currentState.sun.azimuth, elevation: currentState.sun.elevation }}
              earth={{ azimuth: currentState.earth.azimuth, elevation: currentState.earth.elevation }}
            />
          </div>

          <div className={tab === 'timeline' ? 'block' : 'hidden lg:block'}>
            <Suspense
              fallback={
                <div className="rounded-lg border border-space-800 bg-space-900 p-4 text-sm text-slate-400" role="status">
                  Loading timeline…
                </div>
              }
            >
              <NavigatorTimeline samples={stats.samples} currentMs={current.getTime()} />
            </Suspense>
          </div>
        </div>

        {/* Right: readouts + method. */}
        <div className="order-2 space-y-4 lg:order-3">
          <SunEarthCards
            state={currentState}
            nextSun={nextSun}
            nextEarth={nextEarth}
            current={current}
            stats={stats}
          />
          <details className="rounded-lg border border-space-800 bg-space-900 p-4 text-sm shadow-panel">
            <summary className="cursor-pointer font-medium text-slate-200">
              Method &amp; assumptions
            </summary>
            <div className="mt-2 space-y-2 text-slate-300">
              <p>
                For a site (φ, λ) and a body whose sub-point is (φ<sub>b</sub>, λ
                <sub>b</sub>):
              </p>
              <p className="rounded bg-space-950 p-2 font-mono text-xs">
                elevation = asin( sinφ·sinφ<sub>b</sub> + cosφ·cosφ<sub>b</sub>·cos(λ −
                λ<sub>b</sub>) )
              </p>
              <p>
                Azimuth is the standard spherical formula, 0° = north, clockwise,
                0–360°. Sun-disc mode judges “Sun up” by the upper limb (+0.27°).
              </p>
              <p>
                Sources: Sun/Moon positions from the{' '}
                <span className="text-slate-100">astronomy-engine</span> package (MIT);
                sub-Earth point from its libration (Meeus ch. 53); sub-solar point by
                Meeus ch. 53&apos;s construction. Site coordinates come from the mission
                dataset (NASA CLPS deliveries, USGS Gazetteer — approximate feature
                centres).
              </p>
              <p>
                Limits: geometric ideal horizon — terrain obstruction is NOT included, so
                a real lander behind a ridge sees less sky than this. Positions are
                good to about ±0.3°. Nothing here is survey-grade. Sun 3D model: NASA
                Solar System Exploration, public domain. Earth globe is stylized, not
                surveyed coastlines.
              </p>
            </div>
          </details>
          <p className="text-xs text-slate-400">
            <Link to="/missions" className="text-accent underline">
              Browse all missions
            </Link>
            {' · '}
            <Link to="/map" className="text-accent underline">
              Moon map
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
