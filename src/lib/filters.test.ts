import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  filterMissions,
  filterOptions,
  filtersFromParams,
  filtersToParams,
} from './filters';
import { missions } from './missions';

describe('filterMissions (FR-3)', () => {
  it('empty filters return everything', () => {
    expect(filterMissions(missions, EMPTY_FILTERS)).toHaveLength(missions.length);
  });

  it('filters by status; OR within the group', () => {
    const out = filterMissions(missions, { ...EMPTY_FILTERS, status: ['completed', 'failed'] });
    expect(out.map((m) => m.id).sort()).toEqual(['to19d', 'to2-ab', 'to2-im']);
  });

  it('filters by provider', () => {
    const out = filterMissions(missions, { ...EMPTY_FILTERS, provider: ['Blue Origin'] });
    expect(out.map((m) => m.id)).toEqual(['ct-3']);
  });

  it('filters by launch year and excludes missions without dates', () => {
    const out = filterMissions(missions, { ...EMPTY_FILTERS, year: ['2024'] });
    expect(out.map((m) => m.id).sort()).toEqual(['to2-ab', 'to2-im']);
  });

  it('filters by landing region', () => {
    const out = filterMissions(missions, { ...EMPTY_FILTERS, region: ['south polar'] });
    expect(out.map((m) => m.id).sort()).toEqual([
      'cp-22',
      'cs-6',
      'ct-3',
      'ct-4',
      'prime-1',
      'to2-im',
      'to20a',
    ]);
  });

  it('combines groups with AND', () => {
    const out = filterMissions(missions, {
      ...EMPTY_FILTERS,
      provider: ['Intuitive Machines', 'Blue Origin'],
      region: ['south polar'],
    });
    expect(out.map((m) => m.id).sort()).toEqual(['cp-22', 'ct-3', 'ct-4', 'prime-1', 'to2-im']);
  });

  it('null provider/region never matches an active group filter', () => {
    const out = filterMissions(missions, { ...EMPTY_FILTERS, provider: ['Astrobotic'] });
    expect(out.some((m) => m.provider === null)).toBe(false);
  });
});

describe('filterOptions', () => {
  it('derives unique sorted values from the dataset', () => {
    const opts = filterOptions(missions);
    expect(opts.status).toContain('completed');
    expect(opts.year).toEqual(['2024']);
    expect(opts.region).toEqual(['far side', 'near side', 'south polar']);
    expect(opts.provider).toContain('Intuitive Machines');
    expect(opts.provider).not.toContain('');
  });
});

describe('URL round-trip (FR-9)', () => {
  it('serializes only non-empty groups and parses them back', () => {
    const filters: typeof EMPTY_FILTERS = {
      status: ['completed', 'failed'],
      provider: [],
      year: [],
      region: ['south polar'],
    };
    const params = filtersToParams(filters);
    expect(params).toEqual({
      status: 'completed,failed',
      provider: null,
      year: null,
      region: 'south polar',
    });
    const back = filtersFromParams((k) => params[k] ?? null);
    expect(back).toEqual(filters);
  });

  it('parses missing and empty params as no filters', () => {
    expect(filtersFromParams(() => null)).toEqual(EMPTY_FILTERS);
    expect(filtersFromParams((k) => (k === 'status' ? '' : null))).toEqual(EMPTY_FILTERS);
  });
});
