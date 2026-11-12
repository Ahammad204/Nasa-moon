import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { missions } from '../../lib/missions';
import type { Mission } from '../../lib/types';
import StatusBadge from '../StatusBadge';

// "Mission Timeline" — all 15 CLPS missions in launch order.
// Only 2 missions have a published launch date in the dataset; the rest
// are shown honestly as "Date TBA" in dataset order, never with an
// invented date.

function fmtLaunch(d: string | null): string {
  if (!d) return 'Date TBA';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${d}T00:00:00Z`));
}

function Node({ mission }: { mission: Mission }) {
  return (
    <Link
      to={`/mission/${mission.id}`}
      className="flex w-56 shrink-0 flex-col rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel hover:border-accent/50"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 shrink-0 rounded-full bg-accent"
        />
        <span className="text-sm font-semibold tabular-nums text-slate-100">
          {fmtLaunch(mission.launchDate)}
        </span>
      </span>
      <span className="mt-2 font-semibold leading-snug text-slate-100">
        {mission.name}
      </span>
      <span className="mt-0.5 text-sm text-slate-400">
        {mission.provider ?? 'Provider TBA'}
        {mission.lander ? ` · ${mission.lander}` : ''}
      </span>
      <span className="mt-2">
        <StatusBadge status={mission.status} />
      </span>
    </Link>
  );
}

export default function MissionTimeline() {
  const { dated, tba } = useMemo(() => {
    const dated = missions
      .filter((m) => m.launchDate !== null)
      .sort((a, b) => (a.launchDate! < b.launchDate! ? -1 : 1));
    const tba = missions.filter((m) => m.launchDate === null);
    return { dated, tba };
  }, []);

  return (
    <section aria-labelledby="timeline-heading" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
            🚀 {missions.length} missions · NASA CLPS
          </p>
          <h2 id="timeline-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
            From first launch to what&apos;s next
          </h2>
          <p className="mt-1 max-w-2xl text-slate-300">
            Every CLPS delivery in launch order. Scroll sideways. The two
            missions that have flown are dated; the rest are queued with dates
            still to be announced.
          </p>
        </div>
        <Link
          to="/missions"
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-4 text-sm text-slate-200 hover:bg-space-900"
        >
          All missions →
        </Link>
      </div>

      {/* The line. */}
      <div className="relative mt-6">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-[7px] h-0.5 bg-gradient-to-r from-accent via-accent-dim to-space-700"
        />
        <div className="relative flex gap-3 overflow-x-auto pb-2 pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dated.map((m) => (
            <Node key={m.id} mission={m} />
          ))}
          {tba.length > 0 && (
            <div className="flex w-56 shrink-0 flex-col justify-center rounded-lg border border-dashed border-space-700 bg-space-950 p-4">
              <p className="text-sm font-semibold text-slate-200">
                ⏳ Dates to be announced
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {tba.length} upcoming {tba.length === 1 ? 'mission' : 'missions'}{' '}
                with no published launch date yet.
              </p>
            </div>
          )}
          {tba.map((m) => (
            <Node key={m.id} mission={m} />
          ))}
        </div>
        {/* Fade at the right edge hints there is more to scroll, now that
            the native scrollbar is hidden. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-16 bg-gradient-to-l from-space-950 to-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Swipe or scroll sideways. Dates from NASA CLPS Deliveries; undated
        missions are shown in dataset order, not launch order.
      </p>
    </section>
  );
}
