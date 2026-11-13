// Lunar Feature Explorer — Phase 2 (engine).
//
// Pure TypeScript: filtering, spherical gridding and radius queries over
// the USGS Gazetteer Moon features (see scripts/build-features.mjs and
// src/data/lunar-features.json). No React, no DOM, no imports from
// src/data — callers pass the records in. Phase 3 (UI) reuses the
// LunarFeatureRecord type and these functions.
//
// Standing rule (Boss: "Andaje kisu krio na"): unknown values are null
// and are never estimated. A feature with a null diameter is excluded
// ONLY while a size filter is active; otherwise it behaves like any
// other record.

export const MOON_RADIUS_KM = 1737.4;

// Grouped categories produced by scripts/build-features.mjs. "Crater"
// includes the lettered satellite craters (raw type "Satellite Feature",
// code SF); the raw featureType / typeName stay on the record.
export type FeatureCategory =
  | 'Crater'
  | 'Maria'
  | 'Mountain'
  | 'Valley'
  | 'Plain'
  | 'Other';

// One record of src/data/lunar-features.json. Field meanings:
//   featureType  raw Gazetteer 2-letter code (e.g. "AA", "SF")
//   typeName     raw Gazetteer descriptive type (e.g. "Crater, craters")
//   category     grouped label (see FeatureCategory)
//   lat / lon    centre, degrees; lon is EAST-POSITIVE in [-180, 180]
//   diameterKm   km, or null when the Gazetteer does not publish one
//   originOfName / approvalYear  null when unknown
//   gazetteerUrl https://planetarynames.wr.usgs.gov/Feature/<id>
//   sources      ["usgs-gazetteer"]; lastVerified is a YYYY-MM-DD date.
export interface LunarFeatureRecord {
  id: number;
  name: string;
  featureType: string;
  typeName: string;
  category: FeatureCategory;
  lat: number;
  lon: number;
  diameterKm: number | null;
  originOfName: string | null;
  approvalYear: number | null;
  gazetteerUrl: string;
  sources: string[];
  lastVerified: string;
}

export interface FeatureFilters {
  /** Categories to keep (OR within the group; empty/omitted = all). */
  categories?: string[];
  /** Raw Gazetteer type codes to keep, e.g. ["AA", "SF"] (OR; empty = all). */
  rawTypes?: string[];
  /** Minimum diameter in km. Features with null diameter are excluded. */
  minDiameterKm?: number | null;
  /** Maximum diameter in km. Features with null diameter are excluded. */
  maxDiameterKm?: number | null;
  /** Substring match on name, case- and diacritics-insensitive. */
  nameQuery?: string;
  /**
   * Near side vs far side. This is a SIMPLE LONGITUDE SPLIT — near is
   * lon in [-90, 90] — not the true limb: the real near/far boundary is
   * the great circle through the sub-Earth point, which moves with
   * libration. Good enough for a heat-map split, not for science.
   */
  side?: 'near' | 'far';
  /** Inclusive latitude bounds, degrees. */
  minLat?: number;
  /** Inclusive latitude bounds, degrees. */
  maxLat?: number;
  /** Keep only lat <= -80. */
  southPoleOnly?: boolean;
  /** Keep only features within radiusKm of this point (haversine). */
  nearPoint?: { lat: number; lon: number; radiusKm: number };
}

export const EMPTY_FEATURE_FILTERS: FeatureFilters = {};

// NFD splits e.g. "ö" into "o" + combining diaeresis; stripping the
// combining marks (U+0300–U+036F) makes "Schröteri" match "Schroteri".
function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function hasDiameterFilter(filters: FeatureFilters): boolean {
  return (
    (filters.minDiameterKm !== undefined && filters.minDiameterKm !== null) ||
    (filters.maxDiameterKm !== undefined && filters.maxDiameterKm !== null)
  );
}

export function greatCircleDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  // Clamp: floating-point rounding can push a a hair above 1 for
  // antipodal points, and Math.asin would then return NaN.
  return 2 * MOON_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * All filter groups combine with AND; categories and rawTypes are OR
 * within their group. An empty filter object returns the input unchanged
 * (same order, new array). Never throws on empty input or on a filter
 * that matches nothing — it returns [].
 */
export function filterFeatures(
  features: readonly LunarFeatureRecord[],
  filters: FeatureFilters,
): LunarFeatureRecord[] {
  const query = filters.nameQuery?.trim();
  const foldedQuery = query ? foldForSearch(query) : null;
  const sizeFilterActive = hasDiameterFilter(filters);

  return features.filter((f) => {
    if (filters.categories?.length && !filters.categories.includes(f.category)) return false;
    if (filters.rawTypes?.length && !filters.rawTypes.includes(f.featureType)) return false;

    if (sizeFilterActive) {
      // Null diameter is excluded ONLY while a size filter is active.
      if (f.diameterKm === null) return false;
      if (filters.minDiameterKm !== undefined && filters.minDiameterKm !== null) {
        if (f.diameterKm < filters.minDiameterKm) return false;
      }
      if (filters.maxDiameterKm !== undefined && filters.maxDiameterKm !== null) {
        if (f.diameterKm > filters.maxDiameterKm) return false;
      }
    }

    if (foldedQuery !== null && !foldForSearch(f.name).includes(foldedQuery)) return false;

    if (filters.side === 'near' && (f.lon < -90 || f.lon > 90)) return false;
    if (filters.side === 'far' && f.lon >= -90 && f.lon <= 90) return false;

    if (filters.minLat !== undefined && f.lat < filters.minLat) return false;
    if (filters.maxLat !== undefined && f.lat > filters.maxLat) return false;
    if (filters.southPoleOnly && f.lat > -80) return false;

    if (filters.nearPoint) {
      const d = greatCircleDistanceKm(
        f.lat,
        f.lon,
        filters.nearPoint.lat,
        filters.nearPoint.lon,
      );
      if (d > filters.nearPoint.radiusKm) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Gridding
// ---------------------------------------------------------------------------

export interface GridCell {
  /**
   * Stable id: `lat<latMin>/lon<lonMin>` — the cell's LOWER-LEFT corner
   * in degrees, e.g. `lat0/lon0` is lat [0, 5), lon [0, 5) at 5°.
   * Negative corners keep their minus sign: `lat-90/lon-180`.
   */
  id: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  count: number;
  /** True spherical area of the cell in km^2 (Moon radius 1737.4 km). */
  areaKm2: number;
  /** count per 1000 km^2 of true cell area. */
  densityPer1000Km2: number;
  /** Per-category counts inside this cell (only categories present). */
  byCategory: Record<string, number>;
}

export const DEFAULT_CELL_DEG = 5;

// True area of a lat/lon cell on a sphere: R^2 * dLon(rad) *
// (sin(latMax) - sin(latMin)). Area scales with cos(lat), so a polar
// cell is far smaller than an equatorial cell of the same degrees —
// densities computed from this area are not biased by latitude.
export function sphericalCellAreaKm2(
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  return (
    MOON_RADIUS_KM ** 2 *
    (toRad(lonMax) - toRad(lonMin)) *
    (Math.sin(toRad(latMax)) - Math.sin(toRad(latMin)))
  );
}

export function cellIdFor(latMin: number, lonMin: number): string {
  return `lat${latMin}/lon${lonMin}`;
}

function validateCellDeg(cellDeg: number): void {
  if (!Number.isFinite(cellDeg) || cellDeg <= 0) {
    throw new RangeError(`cellDeg must be a positive number, got ${cellDeg}`);
  }
  // The grid must tile the sphere exactly: 180 and 360 divisible by cellDeg.
  const latCells = 180 / cellDeg;
  const lonCells = 360 / cellDeg;
  if (!Number.isInteger(latCells) || !Number.isInteger(lonCells)) {
    throw new RangeError(
      `cellDeg ${cellDeg} does not tile the sphere (180 / ${cellDeg} = ${latCells})`,
    );
  }
}

function cellBoundsFor(lat: number, lon: number, cellDeg: number): {
  latMin: number;
  lonMin: number;
} {
  // Clamp the poles / dateline edge into the last cell: lat 90 belongs
  // to [90 - cellDeg, 90], lon 180 to [180 - cellDeg, 180].
  const latIndex = Math.min(
    Math.floor((lat + 90) / cellDeg),
    Math.floor(180 / cellDeg) - 1,
  );
  const lonIndex = Math.min(
    Math.floor((lon + 180) / cellDeg),
    Math.floor(360 / cellDeg) - 1,
  );
  return { latMin: -90 + latIndex * cellDeg, lonMin: -180 + lonIndex * cellDeg };
}

/**
 * Bins features into lat/lon cells of cellDeg x cellDeg degrees
 * (default 5; 2.5 and 10 also tile the sphere). Only non-empty cells
 * are returned, sorted by latitude then longitude, so the sum of
 * `count` over the returned cells equals features.length. Density is
 * per 1000 km^2 of TRUE spherical cell area, so a polar cell with the
 * same count as an equatorial cell gets a proportionally higher density.
 */
export function binToGrid(
  features: readonly LunarFeatureRecord[],
  cellDeg: number = DEFAULT_CELL_DEG,
): GridCell[] {
  validateCellDeg(cellDeg);
  const cells = new Map<string, GridCell>();

  for (const f of features) {
    const { latMin, lonMin } = cellBoundsFor(f.lat, f.lon, cellDeg);
    const id = cellIdFor(latMin, lonMin);
    let cell = cells.get(id);
    if (!cell) {
      const latMax = latMin + cellDeg;
      const lonMax = lonMin + cellDeg;
      cell = {
        id,
        latMin,
        latMax,
        lonMin,
        lonMax,
        count: 0,
        areaKm2: sphericalCellAreaKm2(latMin, latMax, lonMin, lonMax),
        densityPer1000Km2: 0,
        byCategory: {},
      };
      cells.set(id, cell);
    }
    cell.count += 1;
    cell.byCategory[f.category] = (cell.byCategory[f.category] ?? 0) + 1;
  }

  const out = [...cells.values()];
  for (const cell of out) {
    cell.densityPer1000Km2 = (cell.count / cell.areaKm2) * 1000;
  }
  out.sort((a, b) => a.latMin - b.latMin || a.lonMin - b.lonMin);
  return out;
}

/**
 * Parses a cell id produced by binToGrid (`lat<latMin>/lon<lonMin>`)
 * and returns the features inside that cell. A malformed id returns []
 * instead of throwing. cellDeg must match the one used to build the id.
 */
export function featuresInCell(
  features: readonly LunarFeatureRecord[],
  cellId: string,
  cellDeg: number = DEFAULT_CELL_DEG,
): LunarFeatureRecord[] {
  validateCellDeg(cellDeg);
  const match = /^lat(-?\d+(?:\.\d+)?)\/lon(-?\d+(?:\.\d+)?)$/.exec(cellId.trim());
  if (!match) return [];
  const latMin = Number(match[1]);
  const lonMin = Number(match[2]);
  const latMax = latMin + cellDeg;
  const lonMax = lonMin + cellDeg;
  // binToGrid clamps lat 90 / lon 180 into the last cell, so the top row
  // and rightmost column are closed on the far edge to match.
  const latOk = (lat: number): boolean =>
    latMax === 90 ? lat >= latMin && lat <= latMax : lat >= latMin && lat < latMax;
  const lonOk = (lon: number): boolean =>
    lonMax === 180 ? lon >= lonMin && lon <= lonMax : lon >= lonMin && lon < lonMax;
  return features.filter((f) => latOk(f.lat) && lonOk(f.lon));
}

/**
 * Features within `radiusKm` of (lat, lon), by haversine distance on
 * the Moon sphere (R = 1737.4 km). A 0 km radius returns only features
 * at exactly that point; a negative radius matches nothing. Results
 * are in input order, not sorted by distance.
 */
export function featuresInRadius(
  features: readonly LunarFeatureRecord[],
  lat: number,
  lon: number,
  radiusKm: number,
): LunarFeatureRecord[] {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) return [];
  return features.filter(
    (f) => greatCircleDistanceKm(f.lat, f.lon, lat, lon) <= radiusKm,
  );
}
