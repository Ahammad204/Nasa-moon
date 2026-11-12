import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findNextEvent, getSunEarthState } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import HorizonDiagram from './HorizonDiagram';
import SunEarthCards, { type NextEventInfo } from './SunEarthCards';

/**
 * Compact Sun & Earth panel embedded in the mission detail page and the map
 * selection panel. Shows the state at "now" (refreshed every minute) with a
 * small horizon diagram and a link into the full /navigator route.
 *
 * The next rise/set scan is deferred off first paint (useEffect) so the page
 * stays fast; until it lands the cards show "Calculating next events…".
 */
export default function SunEarthPanel({
  site,
  siteName,
  missionId,
}: {
  site: Site;
  siteName: string;
  missionId?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<{
    sun: NextEventInfo;
    earth: NextEventInfo;
  } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const state = useMemo(() => getSunEarthState(site, now), [site, now]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      const sunSet = findNextEvent(site, now, 'sun', 'set');
      const sunRise = findNextEvent(site, now, 'sun', 'rise');
      const earthSet = findNextEvent(site, now, 'earth', 'set');
      const earthRise = findNextEvent(site, now, 'earth', 'rise');
      if (cancelled) return;
      const pick = (
        set: Date | null,
        rise: Date | null,
      ): NextEventInfo => {
        if (set === null && rise === null) return { at: null, kind: null };
        if (set !== null && rise !== null) {
          return set.getTime() <= rise.getTime()
            ? { at: set, kind: 'set' }
            : { at: rise, kind: 'rise' };
        }
        return set !== null ? { at: set, kind: 'set' } : { at: rise, kind: 'rise' };
      };
      setEvents({ sun: pick(sunSet, sunRise), earth: pick(earthSet, earthRise) });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [site, now]);

  return (
    <section
      aria-label={`Sun and Earth at ${siteName}`}
      className="mb-6 rounded-lg border border-space-800 bg-space-950/60 p-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Sun &amp; Earth at this site</h2>
        {missionId && (
          <Link
            to={`/navigator?site=${missionId}`}
            className="inline-flex min-h-[44px] items-center text-sm text-accent underline"
          >
            Open in Sun &amp; Earth Navigator -&gt;
          </Link>
        )}
      </div>
      <p className="mb-3 text-sm text-slate-400">
        {siteName} · {site.latitude.toFixed(2)}°, {site.longitude.toFixed(2)}° · geometric
        estimate, terrain not included.
      </p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <SunEarthCards
          state={state}
          nextSun={events?.sun ?? { at: null, kind: null }}
          nextEarth={events?.earth ?? { at: null, kind: null }}
          current={now}
          eventsPending={events === null}
        />
        <HorizonDiagram
          site={site}
          date={now}
          sun={{ azimuth: state.sun.azimuth, elevation: state.sun.elevation }}
          earth={{ azimuth: state.earth.azimuth, elevation: state.earth.elevation }}
          size={260}
        />
      </div>
    </section>
  );
}
