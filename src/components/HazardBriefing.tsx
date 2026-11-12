import { useMemo } from 'react';
import { computeWindow, type Site } from '../lib/astro';
import { hazards } from '../lib/hazards';
import SourceBadge from './SourceBadge';

// HazardBriefing — generic hazard context for a landing site.
//
// The four cards are the same everywhere: static charging, fresh impacts,
// thermal extremes, radiation. They are context, not a risk score — no
// per-site hazard rating is invented. The only site-specific numbers are
// the computed illumination geometry (longest dark stretch, sunlit % over
// the next 29.5 days), shown beside the thermal and static-charge cards.
// Sites without verified coordinates get the explicit message instead.
export default function HazardBriefing({
  site,
  siteName,
}: {
  site: Site | null;
  siteName: string;
}) {
  const geometry = useMemo(() => {
    if (!site) return null;
    const start = new Date();
    start.setUTCMinutes(0, 0, 0);
    const stats = computeWindow(site, start, 29.5, 30);
    const windowHours = 29.5 * 24;
    return {
      longestDarkHours: stats.longestDarkStretchHours,
      sunlitPct: (stats.sunlitHours / windowHours) * 100,
    };
  }, [site]);

  return (
    <section
      aria-labelledby="hazard-heading"
      className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
    >
      <h2 id="hazard-heading" className="text-lg font-semibold">
        ⚠️ Hazards at {siteName} (context)
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        What the environment is like here. These are general conditions, not a
        risk score for this site.
      </p>

      {site === null && (
        <p className="mt-3 rounded-md border border-signal-warn/30 bg-signal-warn/10 p-3 text-sm text-signal-warn">
          No verified coordinates, site conditions not computed.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {hazards.map((h) => (
          <article
            key={h.id}
            className="rounded-lg border border-space-800 bg-space-950 p-4"
          >
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-space-900 text-xl"
              >
                {h.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-snug text-slate-100">
                  {h.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  {h.summary}
                </p>
                {(h.id === 'thermal-extremes' ||
                  h.id === 'static-charging-dust') &&
                  geometry && (
                    <p className="mt-2 rounded bg-space-900 p-2 text-sm text-slate-200">
                      <span className="tabular-nums">
                        Longest dark stretch: {geometry.longestDarkHours.toFixed(0)}{' '}
                        h · Sunlit: {geometry.sunlitPct.toFixed(0)}%
                      </span>{' '}
                      <span className="block text-xs text-slate-400">
                        Next 29.5 d from now, computed
                      </span>
                    </p>
                  )}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <SourceBadge ids={h.sourceIds} />
                  <span className="shrink-0 rounded-full bg-space-800 px-2 py-0.5 text-xs text-slate-300">
                    context
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
