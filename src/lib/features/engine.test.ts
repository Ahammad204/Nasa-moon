// Lunar Feature Explorer — Phase 2 (engine) unit tests.
//
// Fixtures are SMALL HAND-MADE arrays, not the real 3.3 MB dataset
// (the Phase 1 validation test already covers the real data; a separate
// engine.smoke.test.ts does one fast pass over it). Where a fixture
// borrows a real feature it uses that feature's real coordinates from
// the Gazetteer download (Copernicus 9.6209, -20.0786; Vallis Schröteri
// 26.1555, -51.5805); everything else is synthetic and labelled so.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CELL_DEG,
  binToGrid,
  cellIdFor,
  featuresInCell,
  featuresInRadius,
  filterFeatures,
  greatCircleDistanceKm,
  sphericalCellAreaKm2,
  type FeatureFilters,
  type LunarFeatureRecord,
} from './engine';

let nextId = 1;
function feature(partial: Partial<LunarFeatureRecord> & { name: string }): LunarFeatureRecord {
  return {
    id: nextId++,
    featureType: 'AA',
    typeName: 'Crater, craters',
    category: 'Crater',
    lat: 0,
    lon: 0,
    diameterKm: 10,
    originOfName: null,
    approvalYear: null,
    gazetteerUrl: `https://planetarynames.wr.usgs.gov/Feature/${nextId}`,
    sources: ['usgs-gazetteer'],
    lastVerified: '2026-11-13',
    ...partial,
  };
}

// Hand-made fixture set: every record's coordinates are chosen here, so
// every expected filter/grid outcome below is derived from this table.
const FIXTURES: LunarFeatureRecord[] = [
  // Real anchors (Gazetteer values).
  feature({ name: 'Copernicus', lat: 9.6209, lon: -20.0786, diameterKm: 96.07 }),
  feature({
    name: 'Vallis Schröteri',
    featureType: 'VA',
    typeName: 'Vallis, valles',
    category: 'Valley',
    lat: 26.1555,
    lon: -51.5805,
    diameterKm: 185.323,
  }),
  // Synthetic records.
  feature({ name: 'Mare Imbrium', featureType: 'ME', typeName: 'Mare, maria', category: 'Maria', lat: 32, lon: -15, diameterKm: 1100 }),
  feature({ name: 'Mons Pico', featureType: 'MO', typeName: 'Mons, montes', category: 'Mountain', lat: 45.7, lon: -8.9, diameterKm: 25 }),
  feature({ name: 'Far Side Crater', lat: -10, lon: 150, diameterKm: 50 }),
  feature({ name: 'Pole Crater', lat: -85, lon: 10, diameterKm: 20 }),
  feature({ name: 'Edge Pole Crater', lat: -80, lon: -30, diameterKm: 15 }),
  feature({ name: 'Just Outside Pole', lat: -79.9, lon: 0, diameterKm: 12 }),
  feature({ name: 'Unknown Size Crater', lat: 5, lon: 5, diameterKm: null }),
  feature({ name: 'Tiny Crater', lat: -5, lon: -5, diameterKm: 0.5 }),
  feature({ name: 'Satellite Crater', featureType: 'SF', typeName: 'Satellite Feature', lat: 12, lon: 22, diameterKm: 8 }),
  feature({ name: 'Equator East', lat: 0, lon: 1, diameterKm: 3 }),
  feature({ name: 'Equator Origin', lat: 0, lon: 0, diameterKm: 3 }),
];

function names(records: LunarFeatureRecord[]): string[] {
  return records.map((r) => r.name).sort();
}

describe('filterFeatures', () => {
  it('empty filters return everything in order', () => {
    const out = filterFeatures(FIXTURES, {});
    expect(out).toHaveLength(FIXTURES.length);
    expect(out).not.toBe(FIXTURES);
    expect(out.map((r) => r.name)).toEqual(FIXTURES.map((r) => r.name));
  });

  it('filters by category, OR within the group', () => {
    const out = filterFeatures(FIXTURES, { categories: ['Maria', 'Mountain'] });
    expect(names(out)).toEqual(['Mare Imbrium', 'Mons Pico']);
  });

  it('filters by raw Gazetteer type code', () => {
    const out = filterFeatures(FIXTURES, { rawTypes: ['SF'] });
    expect(names(out)).toEqual(['Satellite Crater']);
    expect(filterFeatures(FIXTURES, { rawTypes: ['AA', 'VA'] })).toHaveLength(
      FIXTURES.filter((f) => f.featureType === 'AA' || f.featureType === 'VA').length,
    );
  });

  it('filters by diameter min/max, inclusive', () => {
    const out = filterFeatures(FIXTURES, { minDiameterKm: 20, maxDiameterKm: 100 });
    expect(names(out)).toEqual([
      'Copernicus',
      'Far Side Crater',
      'Mons Pico',
      'Pole Crater',
    ]);
  });

  it('null diameter is kept without a size filter, excluded with one', () => {
    expect(names(filterFeatures(FIXTURES, {}))).toContain('Unknown Size Crater');
    expect(names(filterFeatures(FIXTURES, { minDiameterKm: 1 }))).not.toContain(
      'Unknown Size Crater',
    );
    expect(names(filterFeatures(FIXTURES, { maxDiameterKm: 1000 }))).not.toContain(
      'Unknown Size Crater',
    );
    // A record with a known diameter still passes a size filter.
    expect(names(filterFeatures(FIXTURES, { minDiameterKm: 0.4 }))).toContain('Tiny Crater');
  });

  it('name search is case-insensitive', () => {
    expect(names(filterFeatures(FIXTURES, { nameQuery: 'copernicus' }))).toEqual([
      'Copernicus',
    ]);
    expect(names(filterFeatures(FIXTURES, { nameQuery: 'MARE' }))).toEqual(['Mare Imbrium']);
  });

  it('name search is diacritics-insensitive', () => {
    // "Schroteri" (no umlaut) must match "Schröteri".
    expect(names(filterFeatures(FIXTURES, { nameQuery: 'Schroteri' }))).toEqual([
      'Vallis Schröteri',
    ]);
    expect(names(filterFeatures(FIXTURES, { nameQuery: 'schröteri' }))).toEqual([
      'Vallis Schröteri',
    ]);
  });

  it('near/far side is a longitude split at ±90', () => {
    expect(names(filterFeatures(FIXTURES, { side: 'far' }))).toEqual(['Far Side Crater']);
    expect(filterFeatures(FIXTURES, { side: 'near' })).toHaveLength(FIXTURES.length - 1);
  });

  it('filters by latitude range, inclusive', () => {
    const out = filterFeatures(FIXTURES, { minLat: -10, maxLat: 10 });
    expect(names(out)).toEqual([
      'Copernicus',
      'Equator East',
      'Equator Origin',
      'Far Side Crater',
      'Tiny Crater',
      'Unknown Size Crater',
    ]);
  });

  it('southPoleOnly keeps lat <= -80 exactly', () => {
    expect(names(filterFeatures(FIXTURES, { southPoleOnly: true }))).toEqual([
      'Edge Pole Crater',
      'Pole Crater',
    ]);
  });

  it('nearPoint radius returns the feature itself at a small radius', () => {
    const out = filterFeatures(FIXTURES, {
      nearPoint: { lat: 9.6209, lon: -20.0786, radiusKm: 1 },
    });
    expect(names(out)).toEqual(['Copernicus']);
  });

  it('combines groups with AND', () => {
    const filters: FeatureFilters = {
      categories: ['Crater'],
      minDiameterKm: 10,
      side: 'near',
    };
    expect(names(filterFeatures(FIXTURES, filters))).toEqual([
      'Copernicus',
      'Edge Pole Crater',
      'Just Outside Pole',
      'Pole Crater',
    ]);
  });

  it('empty input and no-match filters return [] without crashing', () => {
    expect(filterFeatures([], { categories: ['Crater'] })).toEqual([]);
    expect(filterFeatures(FIXTURES, { categories: ['Crater'], nameQuery: 'zzz-no-match' })).toEqual(
      [],
    );
    expect(filterFeatures(FIXTURES, { minLat: 89 })).toEqual([]);
  });
});

describe('greatCircleDistanceKm', () => {
  it('1° of longitude at the equator is ~30.32 km', () => {
    // 1737.4 * pi / 180 = 30.324... — computed, not guessed.
    expect(greatCircleDistanceKm(0, 0, 0, 1)).toBeCloseTo(30.32, 1);
  });

  it('same point is 0 and antipodal points are ~πR', () => {
    expect(greatCircleDistanceKm(10, 20, 10, 20)).toBe(0);
    expect(greatCircleDistanceKm(0, 0, 0, 180)).toBeCloseTo(Math.PI * 1737.4, 0);
  });
});

describe('binToGrid', () => {
  it('grid total equals the filtered count', () => {
    const filtered = filterFeatures(FIXTURES, { categories: ['Crater'] });
    const cells = binToGrid(filtered);
    const total = cells.reduce((sum, c) => sum + c.count, 0);
    expect(total).toBe(filtered.length);
    const allTotal = binToGrid(FIXTURES).reduce((sum, c) => sum + c.count, 0);
    expect(allTotal).toBe(FIXTURES.length);
  });

  it('cell ids are the lower-left corner: lat0/lon0 holds lat [0,5), lon [0,5)', () => {
    expect(cellIdFor(0, 0)).toBe('lat0/lon0');
    const cells = binToGrid(FIXTURES, 5);
    const origin = cells.find((c) => c.id === 'lat0/lon0');
    expect(origin).toBeDefined();
    // Equator Origin (0,0) and Equator East (0,1); (5,5) is NOT in this
    // cell — lat 5 falls in the next row up, [5, 10).
    expect(origin?.count).toBe(2);
  });

  it('per-category counts add up to the cell count', () => {
    const cells = binToGrid(FIXTURES, 5);
    for (const cell of cells) {
      const sum = Object.values(cell.byCategory).reduce((a, b) => a + b, 0);
      expect(sum).toBe(cell.count);
    }
  });

  it('polar cell area is smaller than equatorial for the same cellDeg', () => {
    const eq = sphericalCellAreaKm2(0, 5, 0, 5);
    const polar = sphericalCellAreaKm2(85, 90, 0, 5);
    expect(polar).toBeLessThan(eq);
    expect(polar / eq).toBeCloseTo(
      (Math.sin((90 * Math.PI) / 180) - Math.sin((85 * Math.PI) / 180)) /
        (Math.sin((5 * Math.PI) / 180) - Math.sin(0)),
      5,
    );
  });

  it('density normalisation: same count, polar density higher by the area ratio', () => {
    const eqFeatures = [
      feature({ name: 'Eq A', lat: 1, lon: 1 }),
      feature({ name: 'Eq B', lat: 2, lon: 2 }),
    ];
    const polarFeatures = [
      feature({ name: 'Polar A', lat: 86, lon: 1 }),
      feature({ name: 'Polar B', lat: 87, lon: 2 }),
    ];
    const eqCell = binToGrid(eqFeatures, 5)[0];
    const polarCell = binToGrid(polarFeatures, 5)[0];
    expect(eqCell.count).toBe(2);
    expect(polarCell.count).toBe(2);
    expect(polarCell.densityPer1000Km2).toBeGreaterThan(eqCell.densityPer1000Km2);
    expect(polarCell.densityPer1000Km2 / eqCell.densityPer1000Km2).toBeCloseTo(
      eqCell.areaKm2 / polarCell.areaKm2,
      5,
    );
  });

  it('supports 2.5° and 10° cells and rejects sizes that do not tile the sphere', () => {
    expect(binToGrid(FIXTURES, 2.5).length).toBeGreaterThan(0);
    expect(binToGrid(FIXTURES, 10).length).toBeGreaterThan(0);
    expect(() => binToGrid(FIXTURES, 7)).toThrow(RangeError);
    expect(() => binToGrid(FIXTURES, 0)).toThrow(RangeError);
  });

  it('pole and dateline edges land in the last cell', () => {
    const edge = [
      feature({ name: 'North Pole', lat: 90, lon: 0 }),
      feature({ name: 'Dateline', lat: 0, lon: 180 }),
    ];
    const cells = binToGrid(edge, 5);
    expect(cells.map((c) => c.id).sort()).toEqual(['lat0/lon175', 'lat85/lon0']);
  });

  it('empty input returns []', () => {
    expect(binToGrid([])).toEqual([]);
    expect(binToGrid([], 10)).toEqual([]);
  });

  it('default cell size is 5°', () => {
    expect(DEFAULT_CELL_DEG).toBe(5);
    expect(binToGrid(FIXTURES)).toEqual(binToGrid(FIXTURES, 5));
  });
});

describe('featuresInCell', () => {
  it('round-trips binToGrid: every cell returns exactly its members', () => {
    const cells = binToGrid(FIXTURES, 5);
    for (const cell of cells) {
      const members = featuresInCell(FIXTURES, cell.id, 5);
      expect(members).toHaveLength(cell.count);
      expect(members.every((f) => cell.byCategory[f.category] !== undefined)).toBe(true);
    }
  });

  it('malformed cell ids return [] instead of throwing', () => {
    expect(featuresInCell(FIXTURES, 'nonsense')).toEqual([]);
    expect(featuresInCell(FIXTURES, 'lat0')).toEqual([]);
    expect(featuresInCell(FIXTURES, '')).toEqual([]);
  });
});

describe('featuresInRadius', () => {
  it('small radius around a feature returns that feature itself', () => {
    const out = featuresInRadius(FIXTURES, 9.6209, -20.0786, 1);
    expect(names(out)).toEqual(['Copernicus']);
  });

  it('1° at the equator: 31 km includes the neighbour, 30 km excludes it', () => {
    expect(names(featuresInRadius(FIXTURES, 0, 0, 31))).toEqual([
      'Equator East',
      'Equator Origin',
    ]);
    expect(names(featuresInRadius(FIXTURES, 0, 0, 30))).toEqual(['Equator Origin']);
  });

  it('0 km returns only features at exactly that point; negative radius returns []', () => {
    expect(names(featuresInRadius(FIXTURES, 0, 0, 0))).toEqual(['Equator Origin']);
    expect(featuresInRadius(FIXTURES, 0, 0, -5)).toEqual([]);
    expect(featuresInRadius(FIXTURES, 1, 1, 0)).toEqual([]);
  });

  it('empty input and no-match radius return []', () => {
    expect(featuresInRadius([], 0, 0, 100)).toEqual([]);
    expect(featuresInRadius(FIXTURES, 80, 170, 10)).toEqual([]);
  });
});
