// Lunar Feature Explorer — URL state round-trip tests (Phase 3b).
//
// No counts are hardcoded; the tests prove parsing is defensive (bad
// values fall back to defaults, never throw) and that serialize(parse(x))
// reproduces the same state.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEATURES_URL_STATE,
  parseFeaturesParams,
  serializeFeaturesState,
  type FeaturesUrlState,
} from './urlState';

function roundTrip(state: FeaturesUrlState): FeaturesUrlState {
  const qs = serializeFeaturesState(state).toString();
  return parseFeaturesParams(new URLSearchParams(qs));
}

describe('parseFeaturesParams', () => {
  it('empty query string gives the defaults', () => {
    expect(parseFeaturesParams(new URLSearchParams(''))).toEqual(
      DEFAULT_FEATURES_URL_STATE,
    );
  });

  it('parses a full filter set', () => {
    const s = parseFeaturesParams(
      new URLSearchParams(
        'cat=Crater,Maria&type=AA,SF&q=tycho&side=near&latmin=-90&latmax=0&pole=1' +
          '&mind=10&maxd=200&near=9.62,-20.08,100&mission=prime-1&cell=2.5' +
          '&mode=markers&op=0.5&missions=1&cellid=lat5%2Flon-25&feat=1296',
      ),
    );
    expect(s.categories).toEqual(['Crater', 'Maria']);
    expect(s.rawTypes).toEqual(['AA', 'SF']);
    expect(s.nameQuery).toBe('tycho');
    expect(s.side).toBe('near');
    expect(s.minLat).toBe(-90);
    expect(s.maxLat).toBe(0);
    expect(s.southPoleOnly).toBe(true);
    expect(s.minDiameterKm).toBe(10);
    expect(s.maxDiameterKm).toBe(200);
    expect(s.nearPoint).toEqual({ lat: 9.62, lon: -20.08, radiusKm: 100 });
    expect(s.nearMissionId).toBe('prime-1');
    expect(s.cellDeg).toBe(2.5);
    expect(s.mode).toBe('markers');
    expect(s.opacity).toBe(0.5);
    expect(s.showMissions).toBe(true);
    expect(s.selectedCellId).toBe('lat5/lon-25');
    expect(s.selectedFeatureId).toBe(1296);
  });

  it('ignores invalid values instead of throwing', () => {
    const s = parseFeaturesParams(
      new URLSearchParams(
        'cat=Crater,Bogus&type=AA,xyz&side=left&latmin=200&latmax=-200' +
          '&mind=-5&maxd=abc&near=1,2&cell=7&mode=dots&op=9&feat=-3',
      ),
    );
    expect(s.categories).toEqual(['Crater']);
    expect(s.rawTypes).toEqual(['AA']);
    expect(s.side).toBeNull();
    expect(s.minLat).toBeNull();
    expect(s.maxLat).toBeNull();
    expect(s.minDiameterKm).toBeNull();
    expect(s.maxDiameterKm).toBeNull();
    expect(s.nearPoint).toBeNull();
    expect(s.cellDeg).toBe(5);
    expect(s.mode).toBe('heat');
    expect(s.opacity).toBe(1);
    expect(s.selectedFeatureId).toBeNull();
  });

  it('an inverted latitude or diameter range is treated as unset', () => {
    const s = parseFeaturesParams(new URLSearchParams('latmin=30&latmax=-30&mind=100&maxd=10'));
    expect(s.minLat).toBeNull();
    expect(s.maxLat).toBeNull();
    expect(s.minDiameterKm).toBeNull();
    expect(s.maxDiameterKm).toBeNull();
  });

  it('serialize omits defaults, so a default view has an empty query string', () => {
    expect(serializeFeaturesState(DEFAULT_FEATURES_URL_STATE).toString()).toBe('');
  });

  it('round-trips a non-default state', () => {
    const state: FeaturesUrlState = {
      ...DEFAULT_FEATURES_URL_STATE,
      categories: ['Maria'],
      nameQuery: 'Tycho',
      cellDeg: 10,
      mode: 'markers',
      selectedFeatureId: 1296,
      nearPoint: { lat: 9.62, lon: -20.08, radiusKm: 100 },
    };
    expect(roundTrip(state)).toEqual(state);
  });
});
