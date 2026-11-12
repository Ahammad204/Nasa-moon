/**
 * Phase 3 tests — site-conditions comparison logic.
 *
 * Physical sanity checks against the real mission dataset plus two explicit
 * fixtures: a far-side site (lon 180, never sees Earth) and a mission with
 * no coordinates (never gets numbers). Window: 7 days from 2026-11-13.
 */
import { describe, expect, it } from 'vitest';
import {
  computeSiteConditions,
  conditionMetrics,
  differingConditionKeys,
  formatHours,
  formatPct,
} from './compareConditions';
import { getMissionById } from './missions';
import type { Mission } from './types';

const START = new Date('2026-11-13T00:00:00Z');
const DAYS = 7;

function syntheticMission(
  id: string,
  latitude: number | null,
  longitude: number | null,
): Mission {
  return {
    id,
    name: `Test ${id}`,
    taskOrder: null,
    provider: null,
    lander: null,
    status: 'upcoming',
    launchDate: null,
    launchDatePrecision: null,
    landingDate: null,
    landingDatePrecision: null,
    landingSite:
      latitude === null || longitude === null
        ? null
        : {
            name: `Test site ${id}`,
            latitude,
            longitude,
            region: null,
            coordinatesApproximate: true,
          },
    payloads: [],
    payloadCountReported: null,
    objective: null,
    outcomeSummary: null,
    notes: null,
    sources: [],
    lastVerified: '2026-11-12',
  };
}

describe('computeSiteConditions', () => {
  it('computes percentages of the window for a real near-side mission', () => {
    const mission = getMissionById('to2-ab')!;
    const [row] = computeSiteConditions([mission], START, DAYS);
    expect(row.hasCoords).toBe(true);
    expect(row.stats).not.toBeNull();
    expect(row.stats!.windowHours).toBe(DAYS * 24);
    // Near-side site sees Earth essentially all the time.
    expect(row.earthPct).toBeGreaterThan(95);
    expect(row.bothPct).toBeLessThanOrEqual(row.sunlitPct);
    expect(row.bothPct).toBeLessThanOrEqual(row.earthPct);
    // Stretches add up to at most the window.
    expect(row.stats!.longestSunlitStretchHours).toBeLessThanOrEqual(DAYS * 24);
    expect(row.stats!.longestDarkStretchHours).toBeLessThanOrEqual(DAYS * 24);
  });

  it('over a full synodic month a real site gets roughly half sunlight', () => {
    // New moon 2026-11-09: the window covers one whole lunar day, so any
    // site is sunlit about half of it regardless of phase.
    const mission = getMissionById('to2-ab')!;
    const [row] = computeSiteConditions([mission], new Date('2026-11-09T07:02:42Z'), 29.53);
    expect(row.sunlitPct).toBeGreaterThan(30);
    expect(row.sunlitPct).toBeLessThan(70);
    expect(row.stats!.longestSunlitStretchHours).toBeGreaterThan(100);
    expect(row.stats!.longestDarkStretchHours).toBeGreaterThan(100);
  });

  it('gives a far-side site zero Earth-visible hours', () => {
    const farSide = syntheticMission('far-side', 0, 180);
    const [row] = computeSiteConditions([farSide], START, DAYS);
    expect(row.hasCoords).toBe(true);
    expect(row.earthPct).toBe(0);
    expect(row.stats!.earthVisibleHours).toBe(0);
    expect(row.bothPct).toBe(0);
  });

  it('gives a south-pole site a grazing Sun, never a high one', () => {
    // Spec ground truth (Phase 1): at lat -89.5 the Sun stays within about
    // +/-2 deg of the horizon all year (axial tilt ~1.54 deg).
    const pole = syntheticMission('pole', -89.5, 0);
    const [row] = computeSiteConditions([pole], START, DAYS);
    expect(row.hasCoords).toBe(true);
    const maxAbsEl = Math.max(...row.stats!.samples.map((s) => Math.abs(s.sunEl)));
    expect(maxAbsEl).toBeLessThan(2.5);
  });

  it('never computes numbers for a mission without coordinates', () => {
    const noCoords = syntheticMission('no-coords', null, null);
    const [row] = computeSiteConditions([noCoords], START, DAYS);
    expect(row.hasCoords).toBe(false);
    expect(row.stats).toBeNull();
    expect(row.sunlitPct).toBe(0);
    expect(row.powerRank).toBeNull();
    expect(row.commsRank).toBeNull();
  });

  it('ranks power by sunlit % and comms by Earth-visible %', () => {
    const nearSide = getMissionById('to2-ab')!;
    const farSide = syntheticMission('far-side', 0, 180);
    const noCoords = syntheticMission('no-coords', null, null);
    const rows = computeSiteConditions([farSide, noCoords, nearSide], START, DAYS);
    const byId = new Map(rows.map((r) => [r.mission.id, r]));
    // Near-side sees Earth ~always; far-side never.
    expect(byId.get('to2-ab')!.commsRank).toBe(1);
    expect(byId.get('far-side')!.commsRank).toBe(2);
    expect(byId.get('no-coords')!.commsRank).toBeNull();
    // Power ranks exist for both sited missions and differ here.
    expect(byId.get('to2-ab')!.powerRank).not.toBeNull();
    expect(byId.get('far-side')!.powerRank).not.toBeNull();
  });

  it('shares a rank on an exact tie', () => {
    const a = syntheticMission('tie-a', 0, 0);
    const b = syntheticMission('tie-b', 0, 0);
    const rows = computeSiteConditions([a, b], START, DAYS);
    expect(rows[0].commsRank).toBe(rows[1].commsRank);
    expect(rows[0].powerRank).toBe(rows[1].powerRank);
  });
});

describe('differingConditionKeys', () => {
  it('flags metrics that differ and ignores identical ones', () => {
    const a = syntheticMission('same-a', 0, 0);
    const b = syntheticMission('same-b', 0, 0);
    const rows = computeSiteConditions([a, b], START, DAYS);
    const metrics = conditionMetrics(DAYS * 24);
    // Identical sites: nothing differs.
    expect(differingConditionKeys(rows, metrics).size).toBe(0);

    const farSide = syntheticMission('far-side', 0, 180);
    const mixed = computeSiteConditions([a, farSide], START, DAYS);
    const diff = differingConditionKeys(mixed, metrics);
    // Earth visibility differs (always vs never), so "both up" differs too.
    // Sunlight is NOT asserted here: two equatorial sites 180 deg apart
    // can legitimately total the same hours over a given week.
    expect(diff.has('earth')).toBe(true);
    expect(diff.has('both')).toBe(true);
  });

  it('counts "no coordinates" as different from a computed value', () => {
    const sited = getMissionById('to2-ab')!;
    const noCoords = syntheticMission('no-coords', null, null);
    const rows = computeSiteConditions([sited, noCoords], START, DAYS);
    const metrics = conditionMetrics(DAYS * 24);
    const diff = differingConditionKeys(rows, metrics);
    expect(diff.size).toBe(metrics.length);
  });
});

describe('formatters', () => {
  it('formats hours and percentages with units', () => {
    expect(formatHours(123.45)).toBe('123.5 h');
    expect(formatHours(0)).toBe('0.0 h');
    expect(formatPct(73.36)).toBe('73.4%');
    expect(formatPct(100)).toBe('100.0%');
  });
});
