import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeWindow } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import { centerIndex, clampIndex } from '../../lib/carousel';
import { useMotionPrefs } from '../../lib/motionPrefs';
import { getSouthPoleSiteById, hasSiteCoordinates } from '../../lib/sites';

// "Featured Landing Sites" — the three south-pole sites with verified
// coordinates, each with real sunlight / Earth-visibility numbers for one
// lunar day (29.5 d from now), computed with the same computeWindow the
// Navigator uses. A site that could not be computed shows "—", never a
// guessed number.
//
// Layout follows the swipeable "try the look" pattern: a horizontal
// scroll-snap carousel (swipe, scroll, arrow buttons or dots) with the
// centred card in focus, and a details panel below for the active site.

const FEATURED_IDS = ['sp-shackleton', 'sp-malapert-massif', 'sp-mons-mouton'] as const;

const ICONS: Record<string, string> = {
  crater: '🌑',
  'artemis-candidate': '⛰️',
};

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
  hours: number | null;
  windowHours: number;
  barClass: string;
  textClass: string;
}) {
  const p = hours === null ? 0 : Math.min(100, Math.max(0, (hours / windowHours) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-300">
          <span aria-hidden="true">{icon} </span>
          {label}
        </span>
        <span className={`font-semibold tabular-nums ${textClass}`}>
          {hours === null ? '—' : `${hours.toFixed(0)} h · ${((hours / windowHours) * 100).toFixed(0)}%`}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-space-800"
        role="img"
        aria-label={`${label}: ${hours === null ? 'not available' : `${hours.toFixed(0)} hours out of ${windowHours.toFixed(0)}`}`}
      >
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function formatCoords(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return 'No verified coordinates';
  return `${Math.abs(lat).toFixed(1)}° S, ${Math.abs(lon).toFixed(1)}° ${lon < 0 ? 'W' : 'E'}`;
}

export default function FeaturedSites() {
  const days = 29.5;
  const windowHours = days * 24;
  const { reduced } = useMotionPrefs();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const cards = useMemo(() => {
    const start = new Date();
    start.setUTCMinutes(0, 0, 0);
    return FEATURED_IDS.map((id) => {
      const site = getSouthPoleSiteById(id);
      if (!site || !hasSiteCoordinates(site)) return { site, stats: null };
      const s: Site = { latitude: site.latitude!, longitude: site.longitude! };
      return { site, stats: computeWindow(s, start, days, 30) };
    });
  }, []);

  const syncActive = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const centers = Array.from(el.querySelectorAll('[data-site-card]')).map((child) => {
      const c = child as HTMLElement;
      return c.offsetLeft + c.offsetWidth / 2;
    });
    const next = centerIndex(centers, el.scrollLeft + el.clientWidth / 2);
    if (next >= 0) setActive(next);
  }, []);

  useEffect(() => {
    syncActive();
  }, [syncActive]);

  const goTo = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const target = clampIndex(index, cards.length);
    if (target < 0) return;
    const child = el.querySelectorAll('[data-site-card]')[target] as HTMLElement | undefined;
    if (!child) return;
    const left = child.offsetLeft + child.offsetWidth / 2 - el.clientWidth / 2;
    el.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  };

  const activeCard = cards[active];
  const activeSite = activeCard?.site ?? null;
  const activeStats = activeCard?.stats ?? null;
  const mapHref =
    activeSite?.latitude != null && activeSite?.longitude != null
      ? `/map?lat=${activeSite.latitude}&lon=${activeSite.longitude}&name=${encodeURIComponent(activeSite.name)}`
      : null;

  return (
    <section aria-labelledby="featured-heading" className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
        📍 The three sites we can actually measure
      </p>
      <h2 id="featured-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
        Featured landing sites
      </h2>
      <p className="mt-1 max-w-2xl text-slate-300">
        Sunlight and Earth visibility over one lunar day (29.5 days from now).
        Only these three Artemis regions have verified coordinates. The other
        eleven are listed on the South Pole page with no numbers guessed.
        Swipe or use the arrows.
      </p>

      <div className="relative mt-5">
        <div
          ref={trackRef}
          onScroll={syncActive}
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured landing sites"
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-[7.5%] sm:px-[calc(50%-210px)]"
        >
          {cards.map(({ site, stats }, i) => {
            if (!site) return null;
            const icon = ICONS[site.kind] ?? '📍';
            const isActive = i === active;
            return (
              <article
                key={site.id}
                data-site-card
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${cards.length}: ${site.name}`}
                className={`flex w-[85%] shrink-0 snap-center flex-col rounded-lg border p-4 shadow-panel transition duration-300 motion-reduce:transition-none sm:w-[420px] ${
                  isActive
                    ? 'border-space-700 bg-space-900 opacity-100'
                    : 'border-space-800 bg-space-900/70 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl" aria-hidden="true">
                      {icon}
                    </p>
                    <h3 className="mt-1 text-lg font-bold leading-snug text-slate-100">{site.name}</h3>
                    <p className="text-xs text-slate-400">
                      {site.kind === 'crater' ? 'Impact crater' : 'Artemis III candidate'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-space-950 px-2 py-1 text-xs tabular-nums text-slate-300">
                    {formatCoords(site.latitude, site.longitude)}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  <Meter
                    label="Sunlight"
                    icon="☀️"
                    hours={stats ? stats.sunlitHours : null}
                    windowHours={windowHours}
                    barClass="bg-amber-400"
                    textClass="text-amber-300"
                  />
                  <Meter
                    label="Earth visible"
                    icon="📡"
                    hours={stats ? stats.earthVisibleHours : null}
                    windowHours={windowHours}
                    barClass="bg-sky-400"
                    textClass="text-sky-300"
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active <= 0}
              aria-label="Previous site"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700 bg-space-900 px-3 text-lg text-slate-200 hover:bg-space-800 disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active >= cards.length - 1}
              aria-label="Next site"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700 bg-space-900 px-3 text-lg text-slate-200 hover:bg-space-800 disabled:opacity-40"
            >
              →
            </button>
          </div>
          <div className="flex gap-2" aria-label="Choose a site">
            {cards.map(({ site }, i) => {
              if (!site) return null;
              return (
                <button
                  key={site.id}
                  type="button"
                  aria-current={i === active}
                  aria-label={`Show ${site.name}`}
                  onClick={() => goTo(i)}
                  className={`min-h-[44px] min-w-[44px] rounded-full text-sm font-semibold tabular-nums ${
                    i === active ? 'bg-amber-400 text-slate-950' : 'bg-space-800 text-slate-300 hover:bg-space-700'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeSite && (
        <div className="mt-4 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-100">{activeSite.name}</h3>
            <p className="text-xs text-slate-400">Coordinates approximate (NASA/USGS feature centres)</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-space-950 px-2 py-1.5">
              <div className="text-sm font-semibold tabular-nums text-emerald-300">
                {activeStats ? `${activeStats.bothHours.toFixed(0)} h` : '—'}
              </div>
              <div className="text-[11px] text-slate-400">Sun + Earth together</div>
            </div>
            <div className="rounded-md bg-space-950 px-2 py-1.5">
              <div className="text-sm font-semibold tabular-nums text-slate-100">
                {activeStats ? `${activeStats.longestDarkStretchHours.toFixed(0)} h` : '—'}
              </div>
              <div className="text-[11px] text-slate-400">Longest dark stretch</div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link
              to={`/navigator?site=${activeSite.id}`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-accent/60 bg-accent-dim/40 px-4 text-sm font-medium text-accent hover:bg-accent-dim/60"
            >
              Open in Navigator →
            </Link>
            {mapHref && (
              <Link
                to={mapHref}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-space-700 bg-space-950 px-4 text-sm font-medium text-slate-200 hover:bg-space-800"
              >
                View on map →
              </Link>
            )}
            <Link
              to="/south-pole"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-space-700 bg-space-950 px-4 text-sm font-medium text-slate-200 hover:bg-space-800"
            >
              All south-pole sites →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
