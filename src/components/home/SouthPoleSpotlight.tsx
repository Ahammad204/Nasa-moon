import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { computeWindow } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import { computableSites } from '../../lib/sites';

// "South Pole Spotlight" — replaces the old plain South Pole section on
// the homepage with the two answers at a glance: which site gets the most
// sunlight (power) and which sees Earth the longest (comms), over one
// lunar day (29.5 d from now). Same computeWindow logic as the
// /south-pole page; only sites with verified coordinates are ranked.

export default function SouthPoleSpotlight() {
  const days = 29.5;
  const windowHours = days * 24;
  const winners = useMemo(() => {
    const start = new Date();
    start.setUTCMinutes(0, 0, 0);
    const rows = computableSites().map((s) => {
      const site: Site = { latitude: s.latitude!, longitude: s.longitude! };
      return { site: s, stats: computeWindow(site, start, days, 30) };
    });
    const bestSun = Math.max(...rows.map((r) => r.stats.sunlitHours), 0);
    const bestEarth = Math.max(...rows.map((r) => r.stats.earthVisibleHours), 0);
    return {
      bestPower: rows.find((r) => r.stats.sunlitHours === bestSun && bestSun > 0),
      bestComms: rows.find(
        (r) => r.stats.earthVisibleHours === bestEarth && bestEarth > 0,
      ),
      windowHours,
    };
  }, []);

  const { bestPower, bestComms } = winners;

  return (
    <section
      aria-labelledby="spotlight-heading"
      className="mt-8 overflow-hidden rounded-xl border border-space-800 bg-gradient-to-b from-space-900 to-space-950 p-5 shadow-panel sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
        🌙 Artemis III · Lunar south pole
      </p>
      <h2 id="spotlight-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
        South Pole — power &amp; communication
      </h2>
      <p className="mt-2 max-w-3xl text-slate-300">
        Artemis III is headed for the lunar south pole, where sunlit ridges sit
        next to permanently shadowed craters. Over one lunar day, here is who
        wins on sunlight — and who wins on staying in touch with Earth.
      </p>

      {bestPower && bestComms ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            to={`/navigator?site=${bestPower.site.id}`}
            className="block rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 hover:bg-amber-400/15"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
              ☀️ Best power
            </p>
            <p className="mt-1 text-xl font-bold text-slate-100">{bestPower.site.name}</p>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-semibold tabular-nums text-amber-300">
                {bestPower.stats.sunlitHours.toFixed(0)} h of sunlight
              </span>{' '}
              out of {windowHours.toFixed(0)} h (
              {((bestPower.stats.sunlitHours / windowHours) * 100).toFixed(0)}% of
              the lunar day)
            </p>
            <p className="mt-2 text-sm font-medium text-amber-300">Open in Navigator →</p>
          </Link>
          <Link
            to={`/navigator?site=${bestComms.site.id}`}
            className="block rounded-lg border border-sky-400/40 bg-sky-400/10 p-4 hover:bg-sky-400/15"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
              📡 Best comms
            </p>
            <p className="mt-1 text-xl font-bold text-slate-100">{bestComms.site.name}</p>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-semibold tabular-nums text-sky-300">
                {bestComms.stats.earthVisibleHours.toFixed(0)} h with Earth in view
              </span>{' '}
              out of {windowHours.toFixed(0)} h (
              {((bestComms.stats.earthVisibleHours / windowHours) * 100).toFixed(0)}
              % of the lunar day)
            </p>
            <p className="mt-2 text-sm font-medium text-sky-300">Open in Navigator →</p>
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          No south-pole site with verified coordinates could be ranked right now.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/south-pole"
          className="inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-5 text-sm font-medium text-white hover:bg-accent/70"
        >
          Compare all south-pole sites →
        </Link>
        <Link
          to="/navigator"
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-5 text-sm text-slate-200 hover:bg-space-900"
        >
          Open the Navigator →
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Geometric estimate — ideal flat horizon, terrain not included.
        Coordinates are approximate feature centres.
      </p>
    </section>
  );
}
