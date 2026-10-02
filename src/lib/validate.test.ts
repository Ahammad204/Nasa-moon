import { describe, expect, it } from 'vitest';
import { missions } from './missions';
import type { DatePrecision, Mission, MissionStatus } from './types';

const STATUSES: MissionStatus[] = [
  'upcoming',
  'in_flight',
  'completed',
  'partial',
  'failed',
  'cancelled',
];

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

const HTML_TAG = /<[a-zA-Z/!][^>]*>/;

describe('data validation (docs/DATA_SCHEMA.md rules)', () => {
  const records: Mission[] = missions;

  it('rule 0: dataset is not empty', () => {
    expect(records.length).toBeGreaterThanOrEqual(15);
  });

  it('rule 1: id is unique and matches /^[a-z0-9-]+$/', () => {
    const ids = records.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
  });

  it('rule 2: sources.length >= 1 and every url starts with https://', () => {
    records.forEach((m) => {
      expect(m.sources.length).toBeGreaterThanOrEqual(1);
      m.sources.forEach((s) => expect(s.url.startsWith('https://')).toBe(true));
    });
  });

  it('rule 3: lastVerified is a valid ISO date', () => {
    records.forEach((m) => {
      expect(m.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(m.lastVerified).getTime())).toBe(false);
    });
  });

  it('rule 4: latitude in [-90, 90]; longitude in [-180, 180] east-positive (D-005)', () => {
    records.forEach((m) => {
      if (m.landingSite?.latitude != null) {
        expect(m.landingSite.latitude).toBeGreaterThanOrEqual(-90);
        expect(m.landingSite.latitude).toBeLessThanOrEqual(90);
      }
      if (m.landingSite?.longitude != null) {
        expect(m.landingSite.longitude).toBeGreaterThanOrEqual(-180);
        expect(m.landingSite.longitude).toBeLessThanOrEqual(180);
      }
    });
  });

  it('rule 5: if latitude or longitude is null, both must be null', () => {
    records.forEach((m) => {
      const site = m.landingSite;
      if (!site) return;
      expect(site.latitude === null).toBe(site.longitude === null);
    });
  });

  it('rule 6: status is one of the enum values', () => {
    records.forEach((m) => expect(STATUSES).toContain(m.status));
  });

  it('rule 7: payloads is an array', () => {
    records.forEach((m) => expect(Array.isArray(m.payloads)).toBe(true));
  });

  it('rule 8: no field contains HTML tags', () => {
    records.forEach((m) => {
      allStrings(m).forEach((s) => expect(s).not.toMatch(HTML_TAG));
    });
  });

  it('dates match their stated precision (YYYY-MM-DD / YYYY-MM / YYYY)', () => {
    const byPrecision = {
      day: /^\d{4}-\d{2}-\d{2}$/,
      month: /^\d{4}-\d{2}$/,
      year: /^\d{4}$/,
    };
    records.forEach((m) => {
      const pairs: [string | null, DatePrecision | null][] = [
        [m.launchDate, m.launchDatePrecision],
        [m.landingDate, m.landingDatePrecision],
      ];
      pairs.forEach(([date, precision]) => {
        if (date === null) {
          expect(precision).toBeNull();
        } else {
          expect(precision).not.toBeNull();
          expect(date).toMatch(byPrecision[precision!]);
        }
      });
    });
  });
});
