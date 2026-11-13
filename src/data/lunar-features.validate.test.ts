import { describe, expect, it } from 'vitest';
import features from './lunar-features.json';
import sources from './sources.json';

// Validation for the Lunar Feature Explorer dataset (Phase 1, data).
// The records come from the USGS Gazetteer of Planetary Nomenclature Moon
// archive — see scripts/build-features.mjs and docs/DATA_SOURCES.md.
// Counts are NOT hardcoded here: they come from the download, so this test
// checks shape and invariants, and prints the per-category counts for the
// human-readable run log.

const CATEGORIES = ['Crater', 'Maria', 'Mountain', 'Valley', 'Plain', 'Other'] as const;
type Category = (typeof CATEGORIES)[number];

interface LunarFeature {
  id: number;
  name: string;
  featureType: string;
  typeName: string;
  category: Category;
  lat: number;
  lon: number;
  diameterKm: number | null;
  originOfName: string | null;
  approvalYear: number | null;
  gazetteerUrl: string;
  sources: string[];
  lastVerified: string;
}

const records = features as unknown as LunarFeature[];

describe('lunar-features data validation', () => {
  it('dataset is not empty', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('ids are unique positive integers', () => {
    const ids = records.map((r) => r.id);
    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('required fields are present and well-formed', () => {
    for (const r of records) {
      expect(typeof r.name).toBe('string');
      expect(r.name.length).toBeGreaterThan(0);
      expect(typeof r.featureType).toBe('string');
      expect(r.featureType.length).toBeGreaterThan(0);
      expect(typeof r.typeName).toBe('string');
      expect(r.typeName.length).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(r.category);
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lon).toBe('number');
      expect(r.diameterKm === null || (typeof r.diameterKm === 'number' && r.diameterKm > 0)).toBe(true);
      expect(r.originOfName === null || typeof r.originOfName === 'string').toBe(true);
      expect(
        r.approvalYear === null ||
          (Number.isInteger(r.approvalYear) &&
            r.approvalYear >= 1919 &&
            r.approvalYear <= new Date().getFullYear()),
      ).toBe(true);
      expect(r.gazetteerUrl).toBe(`https://planetarynames.wr.usgs.gov/Feature/${r.id}`);
      expect(r.sources).toContain('usgs-gazetteer');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(r.lastVerified)).toBe(true);
    }
  });

  it('lat is within [-90, 90] and lon within [-180, 180] (east-positive)', () => {
    for (const r of records) {
      expect(r.lat).toBeGreaterThanOrEqual(-90);
      expect(r.lat).toBeLessThanOrEqual(90);
      expect(r.lon).toBeGreaterThanOrEqual(-180);
      expect(r.lon).toBeLessThanOrEqual(180);
    }
  });

  it('counts per category add up, and every category present has records', () => {
    const counts = new Map<Category, number>();
    for (const r of records) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    expect(total).toBe(records.length);
    for (const [category, count] of counts) {
      expect(count).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log(`lunar-features: ${category}: ${count}`);
    }
    // eslint-disable-next-line no-console
    console.log(`lunar-features: total: ${records.length}`);
  });

  it('sources.json has no duplicate ids and keeps a single usgs-gazetteer entry', () => {
    const ids = (sources as { id: string }[]).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'usgs-gazetteer')).toHaveLength(1);
  });
});
