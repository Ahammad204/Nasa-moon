import { describe, expect, it } from 'vitest';
import { missions } from './missions';
import { southPoleSites } from './sites';
import { conclusions } from './conclusions';
import waterTimelineData from '../data/water-timeline.json';
import { getSourceById, researchSources } from './sources';
import type { DatePrecision, Mission, MissionStatus, SouthPoleSite } from './types';

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

describe('south-pole sites validation (Phase 4 data-honesty rules)', () => {
  const sites: SouthPoleSite[] = southPoleSites;

  it('dataset lists the 13 Artemis III candidate regions plus Shackleton', () => {
    expect(sites.length).toBe(14);
    expect(sites.filter((s) => s.kind === 'artemis-candidate').length).toBe(13);
    expect(sites.filter((s) => s.kind === 'crater').length).toBe(1);
  });

  it('id is unique and matches /^sp-[a-z0-9-]+$/', () => {
    const ids = sites.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^sp-[a-z0-9-]+$/));
  });

  it('name is a non-empty string; kind is a known value', () => {
    sites.forEach((s) => {
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(['artemis-candidate', 'crater']).toContain(s.kind);
    });
  });

  it('sources.length >= 1 and every url starts with https://', () => {
    sites.forEach((s) => {
      expect(s.sources.length).toBeGreaterThanOrEqual(1);
      s.sources.forEach((src) => {
        expect(src.url.startsWith('https://')).toBe(true);
        expect(src.label.trim().length).toBeGreaterThan(0);
        expect(src.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  it('lastVerified is a valid ISO date', () => {
    sites.forEach((s) => {
      expect(s.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(s.lastVerified).getTime())).toBe(false);
    });
  });

  it('latitude in [-90, 90]; longitude in [-180, 180]; both null or both set', () => {
    sites.forEach((s) => {
      expect(s.latitude === null).toBe(s.longitude === null);
      if (s.latitude != null) {
        expect(s.latitude).toBeGreaterThanOrEqual(-90);
        expect(s.latitude).toBeLessThanOrEqual(90);
      }
      if (s.longitude != null) {
        expect(s.longitude).toBeGreaterThanOrEqual(-180);
        expect(s.longitude).toBeLessThanOrEqual(180);
      }
    });
  });

  it('every site is flagged approximate (feature/region centre, never survey-grade)', () => {
    sites.forEach((s) => expect(s.coordinatesApproximate).toBe(true));
  });

  it('every site is a south-pole site (latitude <= -80 or unverified)', () => {
    sites.forEach((s) => {
      if (s.latitude != null) expect(s.latitude).toBeLessThanOrEqual(-80);
    });
  });

  it('no field contains HTML tags', () => {
    sites.forEach((s) => {
      allStrings(s).forEach((str) => expect(str).not.toMatch(HTML_TAG));
    });
  });
});

describe('research sources + library conclusions (Science Context)', () => {
  it('sources.json: 10 approved sources, unique ids, https urls, no forbidden hosts', () => {
    const ids = researchSources.map((s) => s.id);
    expect(researchSources.length).toBe(10);
    expect(new Set(ids).size).toBe(ids.length);
    researchSources.forEach((s) => {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(s.url).not.toMatch(/facebook\.com|jatan\.space|britannica/i);
      expect(s.accessed).toBe('2026-11-12');
      expect(s.shortLabel.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.publisher.length).toBeGreaterThan(0);
    });
  });

  it('conclusions.json: at least 12 conclusions, every source id resolves, usedIn paths are in-app', () => {
    expect(conclusions.length).toBeGreaterThanOrEqual(12);
    const ids = conclusions.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    conclusions.forEach((c) => {
      expect(c.text.length).toBeGreaterThan(20);
      expect(c.sourceIds.length).toBeGreaterThanOrEqual(1);
      c.sourceIds.forEach((sid) => expect(getSourceById(sid)).toBeDefined());
      expect(c.usedIn.path.startsWith('/')).toBe(true);
      expect(c.usedIn.label.length).toBeGreaterThan(0);
    });
  });
});

interface WaterTimelineEvent { year: string; title: string; summary: string; sourceIds: string[]; lastVerified: string; }
const waterTimeline = waterTimelineData as unknown as WaterTimelineEvent[];

describe('water timeline (Science Context)', () => {
  it('6 events in year order, every source id resolves, VIPER only ever described as planned', () => {
    expect(waterTimeline.length).toBe(6);
    const years = waterTimeline.map((e) => e.year);
    expect(years).toEqual(['1961', '1994–1998', '2009', '2018', '2020', '2023']);
    waterTimeline.forEach((e) => {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeGreaterThan(20);
      expect(e.lastVerified).toBe('2026-11-12');
      e.sourceIds.forEach((sid) => expect(getSourceById(sid)).toBeDefined());
      if (/viper/i.test(e.summary)) expect(e.summary).toMatch(/planned VIPER/i);
    });
  });
});
