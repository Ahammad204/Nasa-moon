import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { computeWindow } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import { getSouthPoleSiteById, hasSiteCoordinates } from '../../lib/sites';

// "Featured Landing Sites" — the three south-pole sites with verified
// coordinates, each with real sunlight / Earth-visibility numbers for one
// lunar day (29.5 d from now), computed with the same computeWindow the
// Navigator uses. A site that could not be computed shows "—", never a
// guessed number.

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

export default function FeaturedSites() {
  const days = 29.5;
  const windowHours = days * 24;
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
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {cards.map(({ site, stats }) => {
          if (!site) return null;
          const icon = ICONS[site.kind] ?? '📍';
          return (
            <article
              key={site.id}
              className="flex flex-col rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-2xl" aria-hidden="true">
                    {icon}
                  </p>
                  <h3 className="mt-1 text-lg font-bold leading-snug text-slate-100">
                    {site.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {site.kind === 'crater' ? 'Impact crater' : 'Artemis III candidate'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-space-950 px-2 py-1 text-xs tabular-nums text-slate-300">
                  {site.latitude !== null && site.longitude !== null
                    ? `${Math.abs(site.latitude).toFixed(1)}° S, ${Math.abs(site.longitude).toFixed(1)}° ${site.longitude < 0 ? 'W' : 'E'}`
                    : 'No verified coordinates'}
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
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-space-950 px-2 py-1.5">
                  <div className="text-sm font-semibold tabular-nums text-emerald-300">
                    {stats ? `${stats.bothHours.toFixed(0)} h` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400">Sun + Earth together</div>
                </div>
                <div className="rounded-md bg-space-950 px-2 py-1.5">
                  <div className="text-sm font-semibold tabular-nums text-slate-100">
                    {stats ? `${stats.longestDarkStretchHours.toFixed(0)} h` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400">Longest dark stretch</div>
                </div>
              </div>
              <Link
                to={`/navigator?site=${site.id}`}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-md border border-accent/60 bg-accent-dim/40 px-4 text-sm font-medium text-accent hover:bg-accent-dim/60"
              >
                Open in Navigator →
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
