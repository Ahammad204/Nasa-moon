import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../components/CompareContext';
import CompareCards from '../components/CompareCards';
import CompareTable from '../components/CompareTable';
import EmptyState from '../components/EmptyState';
import { getMissionById } from '../lib/missions';
import { setCompareIds } from '../three/sceneStore';

export default function ComparePage() {
  const { ids, remove } = useCompare();
  const selected = ids.map((id) => getMissionById(id)).filter((m) => m !== undefined);

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
        <CompareCards missions={selected} />
      </div>
    </section>
  );
}
