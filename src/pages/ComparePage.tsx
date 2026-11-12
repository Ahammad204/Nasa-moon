import { useEffect, useMemo } from 'react';
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
import { setCompareIds } from '../three/sceneStore';

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

  // Mirror the URL-backed compare set into the shared 3D scene (L04).
  useEffect(() => {
    setCompareIds(ids);
    return () => setCompareIds([]);
  }, [ids]);

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
    <section>
      <h1 className="mb-4 text-2xl font-bold">Compare missions</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {selected.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => remove(m.id)}
            aria-label={`Remove ${m.name} from compare`}
            className="flex min-h-[44px] items-center gap-1 rounded-full border border-accent/60 bg-accent-dim/40 px-3 text-sm text-accent"
          >
            {m.name} <span aria-hidden="true">(x)</span>
          </button>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <CompareTable missions={selected} />
      </div>
      <div className="md:hidden">
        <CompareCards
          missions={selected}
          conditions={conditions}
          windowHours={window.windowHours}
          windowLabelText={windowLabel(window.windowStart, window.days)}
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
