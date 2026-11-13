// Lunar Feature Explorer — URL state (Phase 3b, UI).
//
// Every filter, the cell size, the map mode, the selected cell and the
// selected feature live in the query string, so any view is shareable:
// loading the page with a shared URL restores the same view. Parsing is
// defensive — an invalid or out-of-range value is ignored (the default
// applies) and the page never crashes on a bad URL.
//
// Param names:
//   cat       comma-separated categories, e.g. cat=Crater,Maria
//   type      comma-separated raw Gazetteer codes, e.g. type=AA,SF
//   q         name search substring
//   side      near | far (simple longitude split, see engine.ts)
//   latmin    minimum latitude, degrees
//   latmax    maximum latitude, degrees
//   pole      1 = south pole only (lat <= -80)
//   mind      minimum diameter, km
//   maxd      maximum diameter, km
//   near      lat,lon,radiusKm triple, e.g. near=9.62,-20.08,100
//   mission   CLPS mission id whose landing site is the near-point centre
//   cell      2.5 | 5 | 10 (cell size, degrees)
//   mode      heat | markers
//   op        heat-map opacity, 0.1..1
//   missions  1 = show the CLPS mission overlay
//   cellid    selected grid cell id, e.g. lat5/lon-25
//   feat      selected feature Gazetteer id (number)
import { EMPTY_FEATURE_FILTERS, type FeatureFilters } from './engine';
import { isFeatureCategory } from './categories';

export type CellDeg = 2.5 | 5 | 10;
export const CELL_DEGREES: CellDeg[] = [2.5, 5, 10];
export const DEFAULT_CELL_DEG: CellDeg = 5;

export type FeaturesMapMode = 'heat' | 'markers';

export interface NearPoint {
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface FeaturesUrlState {
  categories: string[];
  rawTypes: string[];
  nameQuery: string;
  side: 'near' | 'far' | null;
  minLat: number | null;
  maxLat: number | null;
  southPoleOnly: boolean;
  minDiameterKm: number | null;
  maxDiameterKm: number | null;
  nearPoint: NearPoint | null;
  nearMissionId: string | null;
  cellDeg: CellDeg;
  mode: FeaturesMapMode;
  opacity: number;
  showMissions: boolean;
  selectedCellId: string | null;
  selectedFeatureId: number | null;
}

export const DEFAULT_FEATURES_URL_STATE: FeaturesUrlState = {
  categories: [],
  rawTypes: [],
  nameQuery: '',
  side: null,
  minLat: null,
  maxLat: null,
  southPoleOnly: false,
  minDiameterKm: null,
  maxDiameterKm: null,
  nearPoint: null,
  nearMissionId: null,
  cellDeg: DEFAULT_CELL_DEG,
  mode: 'heat',
  opacity: 0.75,
  showMissions: false,
  selectedCellId: null,
  selectedFeatureId: null,
};

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseLat(raw: string | null): number | null {
  const n = parseNumber(raw);
  if (n === null || n < -90 || n > 90) return null;
  return n;
}


function parseCellDeg(raw: string | null): CellDeg {
  const n = parseNumber(raw);
  if (n === 2.5 || n === 5 || n === 10) return n;
  return DEFAULT_CELL_DEG;
}

function parseNearPoint(raw: string | null): NearPoint | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim());
  if (parts.length !== 3) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  const radiusKm = Number(parts[2]);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 5000) return null;
  return { lat, lon, radiusKm };
}

export function parseFeaturesParams(params: URLSearchParams): FeaturesUrlState {
  const categories = parseList(params.get('cat')).filter(isFeatureCategory);
  const rawTypes = parseList(params.get('type')).filter((t) => /^[A-Z]{2}$/.test(t));
  const sideRaw = params.get('side');
  const side: 'near' | 'far' | null = sideRaw === 'near' || sideRaw === 'far' ? sideRaw : null;

  // An inverted latitude range is treated as unset rather than as a
  // filter that can match nothing.
  let minLat = parseLat(params.get('latmin'));
  let maxLat = parseLat(params.get('latmax'));
  if (minLat !== null && maxLat !== null && minLat > maxLat) {
    minLat = null;
    maxLat = null;
  }

  let minDiameterKm = parseNumber(params.get('mind'));
  let maxDiameterKm = parseNumber(params.get('maxd'));
  if (minDiameterKm !== null && (minDiameterKm <= 0 || minDiameterKm > 5000)) {
    minDiameterKm = null;
  }
  if (maxDiameterKm !== null && (maxDiameterKm <= 0 || maxDiameterKm > 5000)) {
    maxDiameterKm = null;
  }
  if (minDiameterKm !== null && maxDiameterKm !== null && minDiameterKm > maxDiameterKm) {
    minDiameterKm = null;
    maxDiameterKm = null;
  }

  const modeRaw = params.get('mode');
  const mode: FeaturesMapMode = modeRaw === 'markers' ? 'markers' : 'heat';
  const opacityRaw = parseNumber(params.get('op'));
  const opacity =
    opacityRaw === null ? DEFAULT_FEATURES_URL_STATE.opacity : Math.min(1, Math.max(0.1, opacityRaw));

  const featRaw = parseNumber(params.get('feat'));
  const selectedFeatureId =
    featRaw !== null && Number.isInteger(featRaw) && featRaw >= 0 ? featRaw : null;

  return {
    categories,
    rawTypes,
    nameQuery: params.get('q') ?? '',
    side,
    minLat,
    maxLat,
    southPoleOnly: params.get('pole') === '1',
    minDiameterKm,
    maxDiameterKm,
    nearPoint: parseNearPoint(params.get('near')),
    nearMissionId: params.get('mission') ?? null,
    cellDeg: parseCellDeg(params.get('cell')),
    mode,
    opacity,
    showMissions: params.get('missions') === '1',
    selectedCellId: params.get('cellid') ?? null,
    selectedFeatureId,
  };
}

/** Serialize back to a query string, omitting every default value. */
export function serializeFeaturesState(state: FeaturesUrlState): URLSearchParams {
  const next = new URLSearchParams();
  if (state.categories.length) next.set('cat', state.categories.join(','));
  if (state.rawTypes.length) next.set('type', state.rawTypes.join(','));
  if (state.nameQuery.trim()) next.set('q', state.nameQuery.trim());
  if (state.side) next.set('side', state.side);
  if (state.minLat !== null) next.set('latmin', String(state.minLat));
  if (state.maxLat !== null) next.set('latmax', String(state.maxLat));
  if (state.southPoleOnly) next.set('pole', '1');
  if (state.minDiameterKm !== null) next.set('mind', String(state.minDiameterKm));
  if (state.maxDiameterKm !== null) next.set('maxd', String(state.maxDiameterKm));
  if (state.nearPoint) {
    next.set(
      'near',
      `${state.nearPoint.lat},${state.nearPoint.lon},${state.nearPoint.radiusKm}`,
    );
  }
  if (state.nearMissionId) next.set('mission', state.nearMissionId);
  if (state.cellDeg !== DEFAULT_CELL_DEG) next.set('cell', String(state.cellDeg));
  if (state.mode !== 'heat') next.set('mode', state.mode);
  if (state.opacity !== DEFAULT_FEATURES_URL_STATE.opacity) {
    next.set('op', String(state.opacity));
  }
  if (state.showMissions) next.set('missions', '1');
  if (state.selectedCellId) next.set('cellid', state.selectedCellId);
  if (state.selectedFeatureId !== null) next.set('feat', String(state.selectedFeatureId));
  return next;
}

/** Convert URL state into the engine's filter object. */
export function featuresStateToFilters(state: FeaturesUrlState): FeatureFilters {
  if (
    state.categories.length === 0 &&
    state.rawTypes.length === 0 &&
    !state.nameQuery.trim() &&
    !state.side &&
    state.minLat === null &&
    state.maxLat === null &&
    !state.southPoleOnly &&
    state.minDiameterKm === null &&
    state.maxDiameterKm === null &&
    !state.nearPoint
  ) {
    return EMPTY_FEATURE_FILTERS;
  }
  return {
    categories: state.categories.length ? state.categories : undefined,
    rawTypes: state.rawTypes.length ? state.rawTypes : undefined,
    nameQuery: state.nameQuery.trim() ? state.nameQuery.trim() : undefined,
    side: state.side ?? undefined,
    minLat: state.minLat ?? undefined,
    maxLat: state.maxLat ?? undefined,
    southPoleOnly: state.southPoleOnly ? true : undefined,
    minDiameterKm: state.minDiameterKm ?? undefined,
    maxDiameterKm: state.maxDiameterKm ?? undefined,
    nearPoint: state.nearPoint ?? undefined,
  };
}

/** True when any filter (not view/selection state) differs from default. */
export function hasActiveFilters(state: FeaturesUrlState): boolean {
  return (
    state.categories.length > 0 ||
    state.rawTypes.length > 0 ||
    state.nameQuery.trim().length > 0 ||
    state.side !== null ||
    state.minLat !== null ||
    state.maxLat !== null ||
    state.southPoleOnly ||
    state.minDiameterKm !== null ||
    state.maxDiameterKm !== null ||
    state.nearPoint !== null
  );
}
