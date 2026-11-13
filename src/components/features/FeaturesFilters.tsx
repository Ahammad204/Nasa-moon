// Lunar Feature Explorer — filters panel (Phase 3b).
//
// Every control writes straight into the URL state (via onPatch), so a
// copied URL restores the same view. The panel is collapsible on desktop
// and a drawer on mobile (the parent controls visibility).
import type { FeaturesUrlState } from '../../lib/features/urlState';
import { CATEGORY_COLORS, CATEGORY_ORDER } from '../../lib/features/categories';
import type { Mission } from '../../lib/types';

export interface RawTypeOption {
  code: string;
  typeName: string;
  count: number;
}

interface Props {
  /** Suffix for input ids — the panel renders twice (desktop sidebar +
      mobile drawer), so ids must stay unique in the DOM. */
  idSuffix: string;
  state: FeaturesUrlState;
  /** Live search input value (debounced into the URL by the parent). */
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  categoryCounts: Record<string, number>;
  rawTypeOptions: RawTypeOption[];
  missionsWithCoords: Mission[];
  pickingNearPoint: boolean;
  onPatch: (patch: Partial<FeaturesUrlState>) => void;
  onReset: () => void;
  onPickNearPoint: () => void;
  onClearNearPoint: () => void;
}

// Diameter sliders run on a log scale: the data spans 0.006–2,592 km,
// so a linear slider would make every crater under 100 km unreachable.
const DIAM_MIN_KM = 0.01;
const DIAM_MAX_KM = 3000;
const LOG_MIN = Math.log10(DIAM_MIN_KM);
const LOG_MAX = Math.log10(DIAM_MAX_KM);

function sliderToKm(v: number): number {
  return Number((10 ** (LOG_MIN + (v / 1000) * (LOG_MAX - LOG_MIN))).toPrecision(2));
}
function kmToSlider(km: number): number {
  return Math.round(((Math.log10(km) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000);
}
function formatKm(km: number): string {
  return km >= 100 ? `${Math.round(km)} km` : `${km} km`;
}

const GROUP = 'mb-5';
const LEGEND = 'mb-2 text-sm font-medium text-slate-200';
const CHECK_ROW = 'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-1 text-sm text-slate-300 hover:bg-space-800';

export default function FeaturesFilters({
  idSuffix,
  state,
  searchDraft,
  onSearchDraftChange,
  categoryCounts,
  rawTypeOptions,
  missionsWithCoords,
  pickingNearPoint,
  onPatch,
  onReset,
  onPickNearPoint,
  onClearNearPoint,
}: Props) {
  const sizeFilterActive = state.minDiameterKm !== null || state.maxDiameterKm !== null;
  const minSlider = state.minDiameterKm !== null ? kmToSlider(state.minDiameterKm) : 0;
  const maxSlider = state.maxDiameterKm !== null ? kmToSlider(state.maxDiameterKm) : 1000;
  const latMinSlider = state.minLat ?? -90;
  const latMaxSlider = state.maxLat ?? 90;

  const toggleInList = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-3 text-sm text-slate-200 hover:bg-space-800"
        >
          Reset filters
        </button>
      </div>

      <fieldset className={GROUP}>
        <legend className={LEGEND}>Category</legend>
        {CATEGORY_ORDER.map((cat) => (
          <label key={cat} className={CHECK_ROW}>
            <input
              type="checkbox"
              checked={state.categories.includes(cat)}
              onChange={() => onPatch({ categories: toggleInList(state.categories, cat) })}
              className="h-4 w-4 accent-sky-400"
            />
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            <span>
              {cat}{' '}
              <span className="text-slate-400">
                ({(categoryCounts[cat] ?? 0).toLocaleString('en-US')})
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <details className={GROUP}>
        <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-slate-200">
          Raw Gazetteer type
          {state.rawTypes.length > 0 && ` (${state.rawTypes.length} selected)`}
        </summary>
        <div className="mt-1">
          {rawTypeOptions.map((t) => (
            <label key={t.code} className={CHECK_ROW}>
              <input
                type="checkbox"
                checked={state.rawTypes.includes(t.code)}
                onChange={() => onPatch({ rawTypes: toggleInList(state.rawTypes, t.code) })}
                className="h-4 w-4 accent-sky-400"
              />
              <span>
                {t.code} — {t.typeName}{' '}
                <span className="text-slate-400">({t.count.toLocaleString('en-US')})</span>
              </span>
            </label>
          ))}
        </div>
      </details>

      <div className={GROUP}>
        <label htmlFor={`features-search${idSuffix}`} className={`${LEGEND} block`}>
          Search by name
        </label>
        <input
          id={`features-search${idSuffix}`}
          type="search"
          value={searchDraft}
          onChange={(e) => onSearchDraftChange(e.target.value)}
          placeholder="e.g. Tycho"
          autoComplete="off"
          className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          Matches part of a name; accents ignored, so “Schroteri” finds “Schröteri”.
        </p>
      </div>

      <fieldset className={GROUP}>
        <legend className={LEGEND}>Diameter (log scale)</legend>
        <label htmlFor={`features-diam-min${idSuffix}`} className="text-sm text-slate-300">
          Min: {state.minDiameterKm !== null ? formatKm(state.minDiameterKm) : 'any'}
        </label>
        <input
          id={`features-diam-min${idSuffix}`}
          type="range"
          min={0}
          max={1000}
          value={minSlider}
          onChange={(e) => {
            const km = sliderToKm(Number(e.target.value));
            onPatch({ minDiameterKm: km <= DIAM_MIN_KM ? null : km });
          }}
          className="w-full accent-sky-400"
        />
        <label htmlFor={`features-diam-max${idSuffix}`} className="text-sm text-slate-300">
          Max: {state.maxDiameterKm !== null ? formatKm(state.maxDiameterKm) : 'any'}
        </label>
        <input
          id={`features-diam-max${idSuffix}`}
          type="range"
          min={0}
          max={1000}
          value={maxSlider}
          onChange={(e) => {
            const km = sliderToKm(Number(e.target.value));
            onPatch({ maxDiameterKm: km >= DIAM_MAX_KM ? null : km });
          }}
          className="w-full accent-sky-400"
        />
        {sizeFilterActive && (
          <p className="mt-1 text-xs text-slate-400">
            A size filter is active: features without a published diameter are excluded.
            4 features in the dataset have no published diameter.
          </p>
        )}
      </fieldset>

      <fieldset className={GROUP}>
        <legend className={LEGEND}>Location</legend>
        <label htmlFor={`features-side${idSuffix}`} className="mb-1 block text-sm text-slate-300">
          Near / far side
        </label>
        <select
          id={`features-side${idSuffix}`}
          value={state.side ?? 'all'}
          onChange={(e) => {
            const v = e.target.value;
            onPatch({ side: v === 'near' || v === 'far' ? v : null });
          }}
          className="mb-3 min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-sm text-slate-100"
        >
          <option value="all">All longitudes</option>
          <option value="near">Near side (lon −90° to 90°)</option>
          <option value="far">Far side (lon beyond ±90°)</option>
        </select>
        <p className="mb-3 text-xs text-slate-400">
          Simple longitude split, not the true limb — the real near/far boundary moves with
          libration.
        </p>
        <label htmlFor={`features-latmin${idSuffix}`} className="text-sm text-slate-300">
          Min latitude: {latMinSlider}°
        </label>
        <input
          id={`features-latmin${idSuffix}`}
          type="range"
          min={-90}
          max={90}
          value={latMinSlider}
          onChange={(e) => {
            const v = Number(e.target.value);
            onPatch({ minLat: v <= -90 ? null : v });
          }}
          className="w-full accent-sky-400"
        />
        <label htmlFor={`features-latmax${idSuffix}`} className="text-sm text-slate-300">
          Max latitude: {latMaxSlider}°
        </label>
        <input
          id={`features-latmax${idSuffix}`}
          type="range"
          min={-90}
          max={90}
          value={latMaxSlider}
          onChange={(e) => {
            const v = Number(e.target.value);
            onPatch({ maxLat: v >= 90 ? null : v });
          }}
          className="w-full accent-sky-400"
        />
        <label className={CHECK_ROW}>
          <input
            type="checkbox"
            checked={state.southPoleOnly}
            onChange={(e) => onPatch({ southPoleOnly: e.target.checked })}
            className="h-4 w-4 accent-sky-400"
          />
          South pole only (lat ≤ −80°)
        </label>
      </fieldset>

      <fieldset className={GROUP}>
        <legend className={LEGEND}>Near a point</legend>
        <label htmlFor={`features-near-radius${idSuffix}`} className="mb-1 block text-sm text-slate-300">
          Radius (km)
        </label>
        <input
          id={`features-near-radius${idSuffix}`}
          type="number"
          min={1}
          max={5000}
          step={1}
          value={state.nearPoint?.radiusKm ?? 100}
          onChange={(e) => {
            const radiusKm = Math.min(5000, Math.max(1, Number(e.target.value) || 100));
            if (state.nearPoint) {
              onPatch({ nearPoint: { ...state.nearPoint, radiusKm } });
            }
          }}
          className="mb-2 min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-sm text-slate-100"
        />
        <label htmlFor={`features-near-mission${idSuffix}`} className="mb-1 block text-sm text-slate-300">
          Centre on a CLPS mission
        </label>
        <select
          id={`features-near-mission${idSuffix}`}
          value={state.nearMissionId ?? ''}
          onChange={(e) => {
            const missionId = e.target.value;
            if (!missionId) {
              onPatch({ nearMissionId: null });
              return;
            }
            const mission = missionsWithCoords.find((m) => m.id === missionId);
            if (
              mission?.landingSite?.latitude == null ||
              mission.landingSite.longitude == null
            ) {
              return;
            }
            onPatch({
              nearMissionId: missionId,
              nearPoint: {
                lat: mission.landingSite.latitude,
                lon: mission.landingSite.longitude,
                radiusKm: state.nearPoint?.radiusKm ?? 100,
              },
            });
          }}
          className="mb-2 min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-sm text-slate-100"
        >
          <option value="">No mission — pick on the map</option>
          {missionsWithCoords.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.landingSite?.name ?? 'landing site'}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={pickingNearPoint}
            onClick={onPickNearPoint}
            className={`inline-flex min-h-[44px] items-center rounded-md border px-3 text-sm ${
              pickingNearPoint
                ? 'border-accent/60 bg-accent-dim text-white'
                : 'border-space-700 text-slate-200 hover:bg-space-800'
            }`}
          >
            {pickingNearPoint ? 'Picking… click the map' : 'Pick a point on the map'}
          </button>
          {state.nearPoint && (
            <button
              type="button"
              onClick={onClearNearPoint}
              className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-3 text-sm text-slate-200 hover:bg-space-800"
            >
              Clear near point
            </button>
          )}
        </div>
        {state.nearPoint && (
          <p className="mt-2 text-xs text-slate-400">
            Near point: {state.nearPoint.lat.toFixed(2)}°, {state.nearPoint.lon.toFixed(2)}° ·
            within {state.nearPoint.radiusKm} km (haversine, Moon radius 1,737.4 km).
          </p>
        )}
      </fieldset>

      <fieldset className={GROUP}>
        <legend className={LEGEND}>Map display</legend>
        <label htmlFor={`features-cell${idSuffix}`} className="mb-1 block text-sm text-slate-300">
          Cell size
        </label>
        <select
          id={`features-cell${idSuffix}`}
          value={String(state.cellDeg)}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v === 2.5 || v === 5 || v === 10) {
              // A cell id from another grid size names a different cell.
              onPatch({ cellDeg: v, selectedCellId: null, selectedFeatureId: null });
            }
          }}
          className="mb-3 min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-sm text-slate-100"
        >
          <option value="2.5">2.5° cells</option>
          <option value="5">5° cells</option>
          <option value="10">10° cells</option>
        </select>
        <div className="mb-3 flex overflow-hidden rounded-md border border-space-700 text-sm" role="group" aria-label="Map mode">
          {(['heat', 'markers'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={state.mode === m}
              onClick={() => onPatch({ mode: m })}
              className={`min-h-[44px] flex-1 px-3 ${
                state.mode === m ? 'bg-accent-dim text-white' : 'text-slate-300 hover:bg-space-900'
              }`}
            >
              {m === 'heat' ? 'Heat map' : 'Individual markers'}
            </button>
          ))}
        </div>
        <label htmlFor={`features-opacity${idSuffix}`} className="text-sm text-slate-300">
          Heat-map opacity: {Math.round(state.opacity * 100)}%
        </label>
        <input
          id={`features-opacity${idSuffix}`}
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={state.opacity}
          onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
          className="w-full accent-sky-400"
        />
        <label className={CHECK_ROW}>
          <input
            type="checkbox"
            checked={state.showMissions}
            onChange={(e) => onPatch({ showMissions: e.target.checked })}
            className="h-4 w-4 accent-sky-400"
          />
          Show CLPS missions (amber markers)
        </label>
      </fieldset>
    </div>
  );
}
