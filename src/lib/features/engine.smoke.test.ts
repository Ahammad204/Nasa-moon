// Lunar Feature Explorer — Phase 2 (engine) smoke test over the REAL
// dataset (src/data/lunar-features.json).
//
// Kept deliberately small and invariant-based: no counts are hardcoded
// (the Phase 1 validation test owns shape/count checks). It proves the
// engine works on real data — including the Step 0 amendment that
// Satellite Features (lettered satellite craters) are grouped under
// "Crater" — and that a radius query around a real feature returns the
// neighbours the same haversine finds in the raw data.

import { describe, expect, it } from 'vitest';
import features from '../../data/lunar-features.json';
import {
  binToGrid,
  featuresInRadius,
  filterFeatures,
  type LunarFeatureRecord,
} from './engine';

const records = features as unknown as LunarFeatureRecord[];

// Copernicus (Gazetteer id 1296): lat 9.6209, lon -20.0786. The six
// features within 100 km were computed from this same dataset with the
// engine's haversine (R = 1737.4 km) before this test was written.
const COPERNICUS_100KM = [
  'Copernicus',
  'Copernicus A',
  'Copernicus B',
  'Copernicus H',
  'Gay-Lussac J',
  'Gay-Lussac N',
];

describe('engine smoke test (real data)', () => {
  it('Step 0 amendment holds: every Satellite Feature is a Crater, Other is only LF/AL/ST', () => {
    expect(records.length).toBeGreaterThan(9000);
    for (const r of records) {
      if (r.featureType === 'SF') expect(r.category).toBe('Crater');
      if (r.typeName === 'Crater, craters') expect(r.category).toBe('Crater');
      if (r.category === 'Other') {
        expect(['LF', 'AL', 'ST']).toContain(r.featureType);
      }
    }
    const craterCount = records.filter((r) => r.category === 'Crater').length;
    expect(craterCount).toBeGreaterThan(8000); // 1,635 named + 7,064 satellite
  });

  it('100 km around Copernicus returns exactly its verified neighbours', () => {
    const out = featuresInRadius(records, 9.6209, -20.0786, 100);
    expect(out.map((r) => r.name).sort()).toEqual([...COPERNICUS_100KM].sort());
  });

  it('diacritics-insensitive search finds Vallis Schröteri in the real data', () => {
    const out = filterFeatures(records, { nameQuery: 'Schroteri' });
    expect(out.map((r) => r.name)).toContain('Vallis Schröteri');
  });

  it('south-pole filter + grid total agree on the real data', () => {
    const southPole = filterFeatures(records, { southPoleOnly: true });
    expect(southPole.length).toBeGreaterThan(0);
    expect(southPole.every((r) => r.lat <= -80)).toBe(true);
    const cells = binToGrid(southPole, 5);
    expect(cells.reduce((sum, c) => sum + c.count, 0)).toBe(southPole.length);
  });
});
