import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompare } from '../components/CompareContext';
import CountUp from '../components/CountUp';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import Loading from '../components/Loading';
import MissionList from '../components/MissionList';
import SearchBar from '../components/SearchBar';
import {
  filterMissions,
  filterOptions,
  filtersFromParams,
  filtersToParams,
  type Filters,
} from '../lib/filters';
import { missions } from '../lib/missions';
import { searchMissions } from '../lib/search';

// Lazy: Recharts stays out of the first bundle (NFR-2).
const ChartsPanel = lazy(() => import('../components/ChartsPanel'));

const OPTIONS = filterOptions(missions);

export default function ListPage() {
  const [params, setParams] = useSearchParams();
  const { ids: compareIds, toggle: toggleCompare } = useCompare();
  const query = params.get('q') ?? '';
  const filters = useMemo(() => filtersFromParams((k) => params.get(k)), [params]);

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  }

  const filtered = useMemo(
    () => filterMissions(searchMissions(missions, query), filters),
    [query, filters]
  );

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Missions</h1>
      <div className="mb-4 max-w-xl">
        <SearchBar value={query} onChange={(q) => updateParams({ q })} />
      </div>
      <FilterBar
        options={OPTIONS}
        value={filters}
        onChange={(f: Filters) => updateParams(filtersToParams(f))}
      />
      <Suspense fallback={<Loading />}>
        <ChartsPanel missions={filtered} />
      </Suspense>
      <p className="mb-3 text-sm text-slate-400" role="status">
        <CountUp value={filtered.length} /> {filtered.length === 1 ? 'mission' : 'missions'}
      </p>
      {filtered.length === 0 ? (
        <EmptyState
          title="No missions match."
          action={
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams();
                const compare = params.get('compare');
                if (compare) next.set('compare', compare);
                setParams(next, { replace: true });
              }}
              className="min-h-[44px] text-accent underline"
            >
              Clear search and filters
            </button>
          }
        />
      ) : (
        <MissionList
          missions={filtered}
          compareIds={compareIds}
          onCompareToggle={toggleCompare}
          onQuickStatus={(status) => updateParams(filtersToParams({ ...filters, status: [status] }))}
          signature={`${query}|${filters.status.join()}|${filters.provider.join()}|${filters.year.join()}|${filters.region.join()}`}
        />
      )}
    </section>
  );
}
