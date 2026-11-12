import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../components/CompareContext';
import CompareCards from '../components/CompareCards';
import SiteConditionsSection from '../components/CompareConditions';
import CompareTable from '../components/CompareTable';
import {
  useCompareWindowState,
  windowLabel,
} from '../components/compare/useCompareWindowState';
import EmptyState from '../components/EmptyState';
import { computeSiteConditions } from '../lib/compareConditions';
import { getMissionById } from '../lib/missions';
import StatusBadge from '../components/StatusBadge';
import { MISSION_ACCENTS } from '../components/CompareTable';

export default function ComparePage() {
  const { ids, remove } = useCompare();
  const selected = useMemo(
    () => ids.map((id) => getMissionById(id)).filter((m) => m !== undefined),
    [ids],
  );
  const { state: window, update: updateWindow } = useCompareWindowState();

  // Site conditions share one window (start + length + Sun-disc mode) across
  // the desktop table and the mobile cards; computeWindow caches per site.
  const conditions = useMemo(
    () => computeSiteConditions(selected, window.windowStart, window.days, window.sunDisc),
    [selected, window.windowStart, window.days, window.sunDisc],
  );

  if (selected.length < 2) {
    return (
      <EmptyState
        title="Pick 2-3 missions to compare"
        body="Use the Compare checkboxes on the mission list or detail pages."
        action={
          <Link to="/missions" className="inline-flex min-h-[44px] items-center text-accent underline">
            Back to missions
          </Link>
        }
      />
    );
  }

  return (
    <section className="pb-28">
      <h1 className="mb-1 text-2xl font-bold">Compare missions</h1>
      <p className="mb-5 text-sm text-slate-400">
        {selected.length} missions, side by side. An amber dot marks a value
        that differs.
      </p>

      {/* Versus header: one card per mission. */}
      <div
        className={`mb-6 grid gap-3 ${
          selected.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {selected.map((m, i) => (
          <article
            key={m.id}
            className="relative overflow-hidden rounded-xl border border-space-800 bg-space-900 p-4"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: MISSION_ACCENTS[i] }}
            />
            <div className="flex items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold leading-snug text-slate-100">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: MISSION_ACCENTS[i] }}
                />
                {m.name}
              </h2>
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label={`Remove ${m.name} from compare`}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-lg text-slate-400 hover:bg-space-800 hover:text-slate-100"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {m.provider ?? 'Provider TBA'}
              {m.lander ? ` · ${m.lander}` : ''}
            </p>
            <p className="mt-3">
              <StatusBadge status={m.status} />
            </p>
          </article>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold">Mission facts</h2>
      <div className="hidden md:block">
        <CompareTable missions={selected} />
      </div>
      <div className="md:hidden">
        <CompareCards
          missions={selected}
          conditions={conditions}
          windowHours={window.windowHours}
          windowLabelText={windowLabel(window.windowStart, window.days)}
          onRemove={remove}
        />
      </div>

      <SiteConditionsSection
        conditions={conditions}
        window={window}
        updateWindow={updateWindow}
      />
    </section>
  );
}
