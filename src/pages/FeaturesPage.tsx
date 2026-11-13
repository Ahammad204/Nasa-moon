// Lunar Feature Explorer — /features (Phase 3b).
//
// Heat map + filters + detail over the 9,087 named USGS Gazetteer Moon
// features. The 3.3 MB dataset is loaded by dynamic import ONLY on this
// route, never statically. All state lives in the query string (see
// lib/features/urlState) so any view is shareable; filtering and binning
// run through the Phase 2 engine (filterFeatures / binToGrid /
// featuresInCell) with useMemo — no reimplementation, no worker.
//
// Honesty notes are part of the UI: the heat map shows density of NAMED
// features, not geological abundance; coordinates are approximate
// feature centres; Lacus is Latin for "lake" — small dark plains, no
// liquid water.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import FeaturesFilters, { type RawTypeOption } from '../components/features/FeaturesFilters';
import FeaturesMap from '../components/features/FeaturesMap';
import FeatureDetailCard from '../components/features/FeatureDetailCard';
import { CATEGORY_COLORS, CATEGORY_ORDER } from '../lib/features/categories';
import { densityLegendBuckets, formatDensity } from '../lib/features/density';
import {
  binToGrid,
  featuresInCell,
  filterFeatures,
  type LunarFeatureRecord,
} from '../lib/features/engine';
import {
  DEFAULT_FEATURES_URL_STATE,
  featuresStateToFilters,
  hasActiveFilters,
  parseFeaturesParams,
  serializeFeaturesState,
  type FeaturesUrlState,
} from '../lib/features/urlState';
import { getMissionById, hasMapPosition, missions } from '../lib/missions';
import { useMotionPrefs } from '../lib/motionPrefs';
import { hasWebGL } from '../lib/webgl';

const CategoryChart = lazy(() => import('../components/features/CategoryChart'));
// Lazy like NavigatorScene3D: the globe's three.js code must never enter
// this route's first-load chunk — it loads only when the globe renders.
const FeaturesGlobe = lazy(() => import('../components/features/FeaturesGlobe'));

const MARKER_CAP = 500;
const ROW_CAP = 100;
const ZOOM_FOR_MARKERS = 3;
const SEARCH_DEBOUNCE_MS = 300;

type LoadState = 'loading' | 'ready' | 'error';
type CellSort = 'name' | 'size-desc' | 'size-asc' | 'type';

function sortCellFeatures(
  features: LunarFeatureRecord[],
  sort: CellSort,
): LunarFeatureRecord[] {
  const out = [...features];
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'type') {
    out.sort((a, b) => a.typeName.localeCompare(b.typeName) || a.name.localeCompare(b.name));
  } else if (sort === 'size-desc') {
    out.sort((a, b) => (b.diameterKm ?? -1) - (a.diameterKm ?? -1));
  } else {
    out.sort((a, b) => (a.diameterKm ?? Infinity) - (b.diameterKm ?? Infinity));
  }
  return out;
}

function activeFilterSummary(state: FeaturesUrlState): string[] {
  const parts: string[] = [];
  if (state.categories.length) parts.push(`Category: ${state.categories.join(', ')}`);
  if (state.rawTypes.length) parts.push(`Type: ${state.rawTypes.join(', ')}`);
  if (state.nameQuery.trim()) parts.push(`Name contains “${state.nameQuery.trim()}”`);
  if (state.side === 'near') parts.push('Near side');
  if (state.side === 'far') parts.push('Far side');
  if (state.minLat !== null || state.maxLat !== null) {
    parts.push(`Latitude ${state.minLat ?? -90}° to ${state.maxLat ?? 90}°`);
  }
  if (state.southPoleOnly) parts.push('South pole only');
  if (state.minDiameterKm !== null || state.maxDiameterKm !== null) {
    parts.push(
      `Diameter ${state.minDiameterKm !== null ? `${state.minDiameterKm} km` : 'any'} to ${
        state.maxDiameterKm !== null ? `${state.maxDiameterKm} km` : 'any'
      }`,
    );
  }
  if (state.nearPoint) {
    parts.push(
      `Within ${state.nearPoint.radiusKm} km of ${state.nearPoint.lat.toFixed(2)}°, ${state.nearPoint.lon.toFixed(2)}°`,
    );
  }
  return parts;
}

export default function FeaturesPage() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseFeaturesParams(params), [params]);
  const { reduced } = useMotionPrefs();
  const [webgl] = useState(() => hasWebGL());
  // Globe is the default view, but only where it can actually render.
  const showGlobe = state.view === 'globe' && webgl && !reduced;
  const globeDisabled = !webgl || reduced;
  // The toggle must report the view actually on screen: when the globe
  // is disabled the flat map shows even with ?view=globe, so pressed
  // state follows the effective view, not the requested one.
  const effectiveView = showGlobe ? 'globe' : 'flat';

  const [all, setAll] = useState<LunarFeatureRecord[] | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pickingNearPoint, setPickingNearPoint] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cellSort, setCellSort] = useState<CellSort>('name');
  const [searchDraft, setSearchDraft] = useState(state.nameQuery);

  // Dynamic import ONLY on this route: the 3.3 MB dataset must never
  // enter another route's bundle.
  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    void import('../data/lunar-features.json')
      .then((mod) => {
        if (cancelled) return;
        setAll(mod.default as unknown as LunarFeatureRecord[]);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
    // loadAttempt is the retry trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempt]);

  // Keep the search box in sync when a shared URL (or Reset) changes it.
  useEffect(() => {
    setSearchDraft(state.nameQuery);
  }, [state.nameQuery]);

  // Debounce the name search into the URL (300 ms); the filter itself
  // reads the URL value, so typing never thrashes the query string.
  useEffect(() => {
    if (searchDraft === state.nameQuery) return;
    const t = window.setTimeout(() => {
      update({ nameQuery: searchDraft });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
    // update is stable (useCallback with setParams); state.nameQuery is
    // the value the draft is converging to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const update = useCallback(
    (patch: Partial<FeaturesUrlState>) => {
      const next = serializeFeaturesState({ ...parseFeaturesParams(params), ...patch });
      // AppShell preserves a ?compare= set across nav clicks; keep it.
      const compare = params.get('compare');
      if (compare) next.set('compare', compare);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const resetFilters = useCallback(() => {
    const keep = {
      cellDeg: state.cellDeg,
      mode: state.mode,
      opacity: state.opacity,
      showMissions: state.showMissions,
      view: state.view,
    };
    const next = serializeFeaturesState({ ...DEFAULT_FEATURES_URL_STATE, ...keep });
    const compare = params.get('compare');
    if (compare) next.set('compare', compare);
    setParams(next, { replace: true });
    setSearchDraft('');
  }, [params, setParams, state.cellDeg, state.mode, state.opacity, state.showMissions, state.view]);

  const filters = useMemo(() => featuresStateToFilters(state), [state]);
  const filtered = useMemo(
    () => (all ? filterFeatures(all, filters) : []),
    [all, filters],
  );
  const grid = useMemo(
    () => binToGrid(filtered, state.cellDeg),
    [filtered, state.cellDeg],
  );
  const maxDensity = useMemo(
    () => grid.reduce((m, c) => Math.max(m, c.densityPer1000Km2), 0),
    [grid],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of all ?? []) counts[f.category] = (counts[f.category] ?? 0) + 1;
    return counts;
  }, [all]);

  const rawTypeOptions = useMemo<RawTypeOption[]>(() => {
    const byCode = new Map<string, RawTypeOption>();
    for (const f of all ?? []) {
      const existing = byCode.get(f.featureType);
      if (existing) existing.count += 1;
      else byCode.set(f.featureType, { code: f.featureType, typeName: f.typeName, count: 1 });
    }
    return [...byCode.values()].sort((a, b) => b.count - a.count);
  }, [all]);

  const missionsWithCoords = useMemo(() => missions.filter(hasMapPosition), []);
  const chartData = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        name: cat,
        count: filtered.filter((f) => f.category === cat).length,
        color: CATEGORY_COLORS[cat],
      })),
    [filtered],
  );

  const selectedCellFeatures = useMemo(() => {
    if (!state.selectedCellId) return [];
    return sortCellFeatures(
      featuresInCell(filtered, state.selectedCellId, state.cellDeg),
      cellSort,
    );
  }, [filtered, state.selectedCellId, state.cellDeg, cellSort]);

  const selectedFeature = useMemo(() => {
    if (state.selectedFeatureId === null || !all) return null;
    return all.find((f) => f.id === state.selectedFeatureId) ?? null;
  }, [all, state.selectedFeatureId]);

  const markersBlocked =
    state.mode === 'markers' && filtered.length > MARKER_CAP && zoom < ZOOM_FOR_MARKERS;
  const markerFeatures = useMemo(
    () => (markersBlocked ? [] : filtered.slice(0, MARKER_CAP)),
    [filtered, markersBlocked],
  );

  const onCellClick = useCallback(
    (cellId: string) => {
      setPickingNearPoint(false);
      update({ selectedCellId: cellId, selectedFeatureId: null });
    },
    [update],
  );

  const onFeatureClick = useCallback(
    (feature: LunarFeatureRecord) => {
      update({ selectedFeatureId: feature.id });
    },
    [update],
  );

  const onMapClick = useCallback(
    (lat: number, lon: number) => {
      update({
        nearPoint: {
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
          radiusKm: state.nearPoint?.radiusKm ?? 100,
        },
        nearMissionId: null,
      });
      setPickingNearPoint(false);
    },
    [update, state.nearPoint],
  );

  const onMissionClick = useCallback(
    (missionId: string) => {
      const m = getMissionById(missionId);
      if (!m?.landingSite?.latitude || m.landingSite.longitude == null) return;
      update({
        nearMissionId: missionId,
        nearPoint: {
          lat: m.landingSite.latitude,
          lon: m.landingSite.longitude,
          radiusKm: state.nearPoint?.radiusKm ?? 100,
        },
      });
    },
    [update, state.nearPoint],
  );

  // Esc closes the detail card first, then the cell panel.
  useEffect(() => {
    if (!state.selectedCellId && state.selectedFeatureId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (state.selectedFeatureId !== null) update({ selectedFeatureId: null });
      else update({ selectedCellId: null });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.selectedCellId, state.selectedFeatureId, update]);

  const closePanel = useCallback(() => {
    update({ selectedCellId: null, selectedFeatureId: null });
  }, [update]);

  const summary = activeFilterSummary(state);
  const legendBuckets = densityLegendBuckets(maxDensity);
  const panelOpen = state.selectedCellId !== null || state.selectedFeatureId !== null;

  // Rendered twice (desktop grid + mobile bottom sheet) with a suffix so
  // the sort select's id stays unique in the DOM.
  const renderCellList = (suffix: string) =>
    state.selectedCellId ? (
      <section
        aria-label="Features in selected cell"
        className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
      >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Cell {state.selectedCellId}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {selectedCellFeatures.length === 0
              ? 'No features in this cell match the current filters.'
              : `${selectedCellFeatures.length.toLocaleString('en-US')} ${
                  selectedCellFeatures.length === 1 ? 'feature' : 'features'
                } in this cell (current filter).`}
          </p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close cell panel"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700 text-slate-200 hover:bg-space-800"
        >
          ✕
        </button>
      </div>
      {selectedCellFeatures.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor={`features-cell-sort-${suffix}`} className="text-sm text-slate-300">
              Sort by
            </label>
            <select
              id={`features-cell-sort-${suffix}`}
              value={cellSort}
              onChange={(e) => setCellSort(e.target.value as CellSort)}
              className="min-h-[44px] rounded-md border border-space-700 bg-space-950 px-3 text-sm text-slate-100"
            >
              <option value="name">Name (A–Z)</option>
              <option value="size-desc">Diameter (largest first)</option>
              <option value="size-asc">Diameter (smallest first)</option>
              <option value="type">Type</option>
            </select>
          </div>
          <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {selectedCellFeatures.slice(0, ROW_CAP).map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onFeatureClick(f)}
                  aria-pressed={state.selectedFeatureId === f.id}
                  className={`flex min-h-[44px] w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                    state.selectedFeatureId === f.id
                      ? 'border-accent/60 bg-accent-dim/30'
                      : 'border-space-800 bg-space-950 hover:bg-space-800'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[f.category] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{f.name}</span>
                    <span className="block text-xs text-slate-400">
                      {f.category} · {f.typeName}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-300">
                    {f.diameterKm !== null ? `${f.diameterKm} km` : 'size n/a'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selectedCellFeatures.length > ROW_CAP && (
            <p className="mt-2 text-xs text-slate-400">
              Showing first {ROW_CAP} of {selectedCellFeatures.length.toLocaleString('en-US')}{' '}
              — sort or narrow the filters to see the rest.
            </p>
          )}
        </>
      )}
    </section>
  ) : null;

  const detailCard = selectedFeature ? (
    <FeatureDetailCard feature={selectedFeature} onClose={() => update({ selectedFeatureId: null })} />
  ) : null;

  const renderFilters = (suffix: string) => (
    <FeaturesFilters
      idSuffix={suffix}
      state={state}
      searchDraft={searchDraft}
      onSearchDraftChange={setSearchDraft}
      categoryCounts={categoryCounts}
      rawTypeOptions={rawTypeOptions}
      missionsWithCoords={missionsWithCoords}
      pickingNearPoint={pickingNearPoint}
      onPatch={update}
      onReset={resetFilters}
      onPickNearPoint={() => setPickingNearPoint((p) => !p)}
      onClearNearPoint={() => update({ nearPoint: null, nearMissionId: null })}
    />
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lunar Feature Explorer</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Every named feature on the Moon, as a density heat map. Click a cell to list its
            features, click a feature for its Gazetteer record and a Navigator link.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-4 text-sm text-slate-200 hover:bg-space-800 lg:hidden"
        >
          Filters{hasActiveFilters(state) ? ' (active)' : ''}
        </button>
      </div>

      {loadState === 'loading' && (
        <div role="status" aria-live="polite" aria-label="Loading named lunar features">
          <div className="h-[50vh] min-h-[320px] animate-pulse rounded-lg border border-space-800 bg-space-900" />
          <p className="mt-3 text-sm text-slate-400">
            Loading named lunar features… 9,087 features
          </p>
        </div>
      )}

      {loadState === 'error' && (
        <div
          role="alert"
          className="rounded-lg border border-signal-danger/50 bg-space-900 p-5 text-sm"
        >
          <p className="font-medium text-slate-100">
            The feature data failed to load.
          </p>
          <p className="mt-1 text-slate-400">
            The USGS Gazetteer dataset (3.3 MB) could not be read. Check the connection and try
            again — nothing else on this page needs it.
          </p>
          <button
            type="button"
            onClick={() => setLoadAttempt((n) => n + 1)}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-4 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === 'ready' && all && (
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
          {/* Filters: sidebar on desktop, drawer on mobile. The drawer is
              portalled to <body>: PageTransition keeps a translateY(0)
              transform on its wrapper, which would otherwise become the
              containing block for fixed elements (and Leaflet panes at
              z-index 400–1000 would paint over it). */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
              {renderFilters('-desktop')}
            </div>
          </aside>
          {filtersOpen &&
            createPortal(
              <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Filters">
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="absolute inset-0 h-full w-full cursor-default bg-black/60"
                />
                <div className="absolute inset-y-0 left-0 w-[86vw] max-w-sm overflow-y-auto border-r border-space-700 bg-space-950 p-4">
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      aria-label="Close filters"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700 text-slate-200"
                    >
                      ✕
                    </button>
                  </div>
                  {renderFilters('-mobile')}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-accent-dim px-4 text-sm font-medium text-white"
                  >
                    Show results
                  </button>
                </div>
              </div>,
              document.body,
            )}

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-300" role="status">
                Showing{' '}
                <span className="font-semibold tabular-nums text-slate-100">
                  {filtered.length.toLocaleString('en-US')}
                </span>{' '}
                of{' '}
                <span className="tabular-nums">{all.length.toLocaleString('en-US')}</span>{' '}
                features
                {summary.length > 0 && (
                  <>
                    {' · '}
                    <span className="text-slate-400">{summary.join(' · ')}</span>
                  </>
                )}
                {hasActiveFilters(state) && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-accent underline"
                    >
                      Reset
                    </button>
                  </>
                )}
              </p>
              <div
                className="flex overflow-hidden rounded-md border border-space-700 text-sm"
                role="group"
                aria-label="Map view"
              >
                {(['globe', 'flat'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={effectiveView === v}
                    disabled={v === 'globe' && globeDisabled}
                    title={
                      v === 'globe' && globeDisabled
                        ? !webgl
                          ? '3D unavailable in this browser. Showing the flat map'
                          : 'Reduced motion is on. Showing the flat map'
                        : undefined
                    }
                    onClick={() => update({ view: v })}
                    className={`min-h-[44px] px-4 ${
                      effectiveView === v
                        ? 'bg-accent-dim text-white'
                        : 'text-slate-300 hover:bg-space-900'
                    } ${v === 'globe' && globeDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {v === 'globe' ? '3D Globe' : 'Flat Map'}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div
                role="status"
                className="rounded-lg border border-space-800 bg-space-900 p-6 text-center"
              >
                <p className="font-medium text-slate-100">No features match these filters.</p>
                <p className="mt-1 text-sm text-slate-400">
                  Try widening the diameter range, clearing the name search, or removing the
                  near-point filter.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-4 text-sm font-medium text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                {showGlobe ? (
                  <Suspense
                    fallback={
                      <div role="status" aria-live="polite">
                        <div className="h-[50vh] min-h-[320px] animate-pulse rounded-lg border border-space-800 bg-space-900" />
                        <p className="mt-3 text-sm text-slate-400">Loading 3D globe…</p>
                      </div>
                    }
                  >
                    <FeaturesGlobe
                      cells={grid}
                      maxDensity={maxDensity}
                      opacity={state.opacity}
                      mode={state.mode}
                      markers={markerFeatures}
                      markersBlocked={markersBlocked}
                      blockedCount={filtered.length}
                      cellDeg={state.cellDeg}
                      selectedCellId={state.selectedCellId}
                      selectedFeatureId={state.selectedFeatureId}
                      showMissions={state.showMissions}
                      missionsWithCoords={missionsWithCoords}
                      pickingNearPoint={pickingNearPoint}
                      nearPoint={state.nearPoint}
                      zoom={zoom}
                      onCellClick={onCellClick}
                      onFeatureClick={onFeatureClick}
                      onMissionClick={(m) => onMissionClick(m.id)}
                      onMapClick={onMapClick}
                      onZoomChange={setZoom}
                    />
                  </Suspense>
                ) : (
                  <FeaturesMap
                    cells={grid}
                    maxDensity={maxDensity}
                    opacity={state.opacity}
                    mode={state.mode}
                    markers={markerFeatures}
                    markersBlocked={markersBlocked}
                    blockedCount={filtered.length}
                    cellDeg={state.cellDeg}
                    selectedCellId={state.selectedCellId}
                    selectedFeatureId={state.selectedFeatureId}
                    showMissions={state.showMissions}
                    missionsWithCoords={missionsWithCoords}
                    pickingNearPoint={pickingNearPoint}
                    nearPoint={state.nearPoint}
                    onCellClick={onCellClick}
                    onFeatureClick={onFeatureClick}
                    onMissionClick={(m) => onMissionClick(m.id)}
                    onMapClick={onMapClick}
                    onZoomChange={setZoom}
                  />
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {showGlobe
                    ? `Drag to rotate · scroll to zoom · click a cell for its features${
                        state.mode === 'markers' ? ' · click a marker for details' : ''
                      }`
                    : `Drag to pan · scroll to zoom · click a cell for its features${
                        state.mode === 'markers' ? ' · click a marker for details' : ''
                      }.`}
                </p>

                {state.mode === 'heat' && legendBuckets.length > 0 && (
                  <div className="mt-3 rounded-lg border border-space-800 bg-space-900 p-3">
                    <p className="text-xs font-medium text-slate-200">
                      Density — features per 1000 km² (true spherical cell area,{' '}
                      {state.cellDeg}° cells)
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {legendBuckets.map((b) => (
                        <li key={b.label} className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span
                            aria-hidden="true"
                            className="inline-block h-3 w-3 rounded-sm border border-space-700"
                            style={{ backgroundColor: b.color }}
                          />
                          <span className="tabular-nums">{b.label}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-400">
                      Densest cell: {formatDensity(maxDensity)} per 1000 km² ·{' '}
                      {grid.length.toLocaleString('en-US')} non-empty cells.
                    </p>
                  </div>
                )}

                {/* Desktop: cell list + detail side by side. */}
                {(state.selectedCellId || detailCard) && (
                  <div className="mt-4 hidden gap-4 md:grid md:grid-cols-2 md:items-start">
                    {renderCellList('-desktop') ?? <div />}
                    {detailCard ?? <div />}
                  </div>
                )}

                {/* Mobile: bottom sheet — detail first when one is selected.
                    Portalled to <body> for the same reason as the drawer
                    (PageTransition's transform would pin `fixed` to the page
                    wrapper instead of the viewport). */}
                {panelOpen &&
                  createPortal(
                    <>
                      <button
                        type="button"
                        aria-label="Close panel"
                        onClick={closePanel}
                        className="fixed inset-0 z-40 cursor-default bg-black/60 md:hidden"
                      />
                      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[68vh] overflow-y-auto rounded-t-xl border border-space-700 bg-space-950 p-4 shadow-panel md:hidden">
                        {selectedFeature ? (
                          <>
                            <button
                              type="button"
                              onClick={() => update({ selectedFeatureId: null })}
                              className="mb-3 inline-flex min-h-[44px] items-center text-sm text-accent underline"
                            >
                              ← Back to cell features
                            </button>
                            {detailCard}
                          </>
                        ) : (
                          renderCellList('-mobile')
                        )}
                      </div>
                    </>,
                    document.body,
                  )}

                <div className="mt-4">
                  <Suspense
                    fallback={
                      <p role="status" className="text-sm text-slate-400">
                        Loading chart…
                      </p>
                    }
                  >
                    <CategoryChart data={chartData} />
                  </Suspense>
                </div>
              </>
            )}

            <div className="mt-4 space-y-2 rounded-lg border border-space-800 bg-space-900 p-4 text-sm text-slate-300">
              <p>
                <span className="font-medium text-slate-100">Read the heat map honestly:</span>{' '}
                it shows density of <em>named</em> features (USGS Gazetteer), not geological
                abundance — naming and survey coverage can bias it.
              </p>
              <p>Coordinates are approximate feature centres.</p>
              <p>
                3D globe: cells are drawn on the canvas and are not keyboard-focusable — use
                the filters and the feature list to reach every feature.
              </p>
              <p>
                Lacus = “lake” in Latin: small dark plains, no liquid water. Source:{' '}
                <Link to="/library" className="text-accent underline">
                  Research Library
                </Link>{' '}
                · data:{' '}
                <a
                  href="https://planetarynames.wr.usgs.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  USGS Gazetteer ↗
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
