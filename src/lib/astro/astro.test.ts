import { describe, expect, it } from 'vitest';
import { computeWindow, findNextEvent, getSubEarthPoint, getSubSolarPoint, getSunEarthState } from './index';

/**
 * Physical sanity checks for the Sun & Earth astronomy core.
 *
 * Ground truths used here (all verified, none invented):
 * - Meeus, "Astronomical Algorithms" Example 53.a: on 1992-04-12 0h TD the
 *   sub-solar point is l0 = 67.90, b0 = +1.46 and the sub-Earth point is
 *   l = -1.23, b = +4.20.
 * - Apollo 11 landed at Tranquility Base (0.674 N, 23.473 E) on
 *   1969-07-20T20:17:00Z in the lunar morning: the Sun stood low in the
 *   EAST, about 10-15 deg up.
 * - New moon (verified 2026-11-09 07:02:42Z): the Moon is between Earth and
 *   Sun, so the NEAR side is dark (Sun below the horizon at (0,0)) and the
 *   FAR side is lit. Full moon (verified 2026-11-24 14:54:04Z) is the
 *   reverse: the near side is fully lit.
 * - The Moon's axial tilt is 1.54 deg, so at the south pole the Sun's
 *   elevation stays within about +/-2 deg of the horizon all year.
 *
 * If any test here fails, the module does NOT ship. Bounds are NOT to be
 * loosened to make a test pass.
 */
describe('sub-points', () => {
  it('Meeus Example 53.a: sub-solar point on 1992-04-12', () => {
    const sub = getSubSolarPoint(new Date('1992-04-12T00:00:00Z'));
    // Book: l0 = 67.90, b0 = +1.46. The 0.27 deg longitude offset is the
    // documented mean-longitude approximation (see subPoints.ts).
    expect(sub.longitude).toBeGreaterThan(67.4);
    expect(sub.longitude).toBeLessThan(68.4);
    expect(sub.latitude).toBeGreaterThan(1.2);
    expect(sub.latitude).toBeLessThan(1.7);
  });

  it('Meeus Example 53.a: sub-Earth point on 1992-04-12', () => {
    const sub = getSubEarthPoint(new Date('1992-04-12T00:00:00Z'));
    expect(sub.longitude).toBeCloseTo(-1.23, 1);
    expect(sub.latitude).toBeCloseTo(4.2, 1);
  });

  it('sub-solar longitude circles the Moon once per synodic month', () => {
    // The sub-solar longitude is measured in the ROTATING frame (relative
    // to the prime meridian), so after one synodic month it returns to
    // (nearly) its starting value — that is what a synodic month IS. The
    // check is therefore that it sweeps the full 360 deg range in between
    // and comes back to where it started.
    const start = new Date('2026-11-09T07:02:42Z');
    const lons: number[] = [];
    for (let d = 0; d <= 29.53; d += 1) {
      lons.push(getSubSolarPoint(new Date(start.getTime() + d * 24 * 3600 * 1000)).longitude);
    }
    expect(Math.min(...lons)).toBeLessThan(-170);
    expect(Math.max(...lons)).toBeGreaterThan(170);
    const lon0 = getSubSolarPoint(start).longitude;
    const lon1 = getSubSolarPoint(new Date(start.getTime() + 29.53 * 24 * 3600 * 1000)).longitude;
    expect(Math.abs(lon1 - lon0)).toBeLessThan(5);
    // Latitude stays within the axial tilt band.
    expect(Math.abs(getSubSolarPoint(start).latitude)).toBeLessThan(2);
  });
});

describe('getSunEarthState', () => {
  it('Apollo 11 landing: Sun low in the east, Earth high', () => {
    const state = getSunEarthState(
      { latitude: 0.674, longitude: 23.473 },
      new Date('1969-07-20T20:17:00Z'),
    );
    expect(state.sun.elevation).toBeGreaterThan(5);
    expect(state.sun.elevation).toBeLessThan(20);
    // Morning: Sun in the east (azimuth ~90 deg).
    expect(state.sun.azimuth).toBeGreaterThan(60);
    expect(state.sun.azimuth).toBeLessThan(120);
    expect(state.sun.up).toBe(true);
    expect(state.earth.up).toBe(true);
  });

  it('new moon: near side dark, far side lit', () => {
    const date = new Date('2026-11-09T07:02:42Z');
    const near = getSunEarthState({ latitude: 0, longitude: 0 }, date);
    expect(near.sun.elevation).toBeLessThan(-60);
    expect(near.sun.up).toBe(false);
    const far = getSunEarthState({ latitude: 0, longitude: 180 }, date);
    expect(far.sun.elevation).toBeGreaterThan(60);
    expect(far.sun.up).toBe(true);
  });

  it('full moon: near side lit', () => {
    const state = getSunEarthState({ latitude: 0, longitude: 0 }, new Date('2026-11-24T14:54:04Z'));
    expect(state.sun.elevation).toBeGreaterThan(60);
    expect(state.sun.up).toBe(true);
  });

  it('near-side centre: Earth near overhead on several dates', () => {
    for (const day of [
      '2026-11-09T07:02:42Z',
      '2026-11-13T12:00:00Z',
      '2026-11-24T14:54:04Z',
      '2026-12-01T12:00:00Z',
    ]) {
      const state = getSunEarthState({ latitude: 0, longitude: 0 }, new Date(day));
      expect(state.earth.elevation).toBeGreaterThan(80);
      expect(state.earth.elevation).toBeLessThan(90);
      expect(state.earth.up).toBe(true);
    }
  });

  it('far side: Earth never up', () => {
    for (const day of [
      '2026-11-09T07:02:42Z',
      '2026-11-13T12:00:00Z',
      '2026-11-24T14:54:04Z',
      '2026-12-01T12:00:00Z',
    ]) {
      const state = getSunEarthState({ latitude: 0, longitude: 180 }, new Date(day));
      expect(state.earth.elevation).toBeLessThan(0);
      expect(state.earth.up).toBe(false);
    }
  });

  it('south pole: Sun grazes the horizon all year', () => {
    for (let m = 0; m < 12; m++) {
      const date = new Date(Date.UTC(2026, m, 15, 12, 0, 0));
      const state = getSunEarthState({ latitude: -89.5, longitude: 0 }, date);
      expect(Math.abs(state.sun.elevation)).toBeLessThan(2);
    }
  });

  it('azimuth: Sun sets in the west at a site 90 deg west of the sub-solar point', () => {
    // Full moon: sub-solar point near (0,0). At (0, +90) the Sun is on the
    // western horizon (setting); at (0, -90) on the eastern horizon (rising).
    const date = new Date('2026-11-24T14:54:04Z');
    const west = getSunEarthState({ latitude: 0, longitude: 90 }, date);
    expect(Math.abs(west.sun.elevation)).toBeLessThan(15);
    expect(west.sun.azimuth).toBeGreaterThan(240);
    expect(west.sun.azimuth).toBeLessThan(300);
    const east = getSunEarthState({ latitude: 0, longitude: -90 }, date);
    expect(Math.abs(east.sun.elevation)).toBeLessThan(15);
    expect(east.sun.azimuth).toBeGreaterThan(60);
    expect(east.sun.azimuth).toBeLessThan(120);
  });

  it('rejects out-of-range sites', () => {
    expect(() => getSunEarthState({ latitude: 91, longitude: 0 }, new Date())).toThrow(RangeError);
    expect(() => getSunEarthState({ latitude: 0, longitude: 181 }, new Date())).toThrow(RangeError);
  });
});

describe('findNextEvent', () => {
  it('finds a sunset within one lunar day at the equator, elevation ~0 there', () => {
    const from = new Date('2026-11-13T00:00:00Z');
    const sunset = findNextEvent({ latitude: 0, longitude: 0 }, from, 'sun', 'set');
    expect(sunset).not.toBeNull();
    expect(sunset!.getTime()).toBeGreaterThan(from.getTime());
    expect(sunset!.getTime()).toBeLessThan(from.getTime() + 30 * 24 * 3600 * 1000);
    const state = getSunEarthState({ latitude: 0, longitude: 0 }, sunset!);
    expect(Math.abs(state.sun.elevation)).toBeLessThan(0.5);
  });

  it('sunrise follows sunset (monotonic)', () => {
    const from = new Date('2026-11-13T00:00:00Z');
    const site = { latitude: 0, longitude: 0 };
    const sunset = findNextEvent(site, from, 'sun', 'set')!;
    const sunrise = findNextEvent(site, sunset, 'sun', 'rise')!;
    expect(sunrise.getTime()).toBeGreaterThan(sunset.getTime());
    expect(sunrise.getTime() - sunset.getTime()).toBeGreaterThan(10 * 24 * 3600 * 1000);
    expect(sunrise.getTime() - sunset.getTime()).toBeLessThan(20 * 24 * 3600 * 1000);
  });

  it('Earth never sets or rises at the near-side centre (null-safe)', () => {
    const from = new Date('2026-11-13T00:00:00Z');
    const site = { latitude: 0, longitude: 0 };
    expect(findNextEvent(site, from, 'earth', 'set')).toBeNull();
    expect(findNextEvent(site, from, 'earth', 'rise')).toBeNull();
  });
});

describe('computeWindow', () => {
  it('one synodic month at (0,0): sunlight is roughly half the month', () => {
    const stats = computeWindow(
      { latitude: 0, longitude: 0 },
      new Date('2026-11-09T07:02:42Z'),
      29.53,
    );
    expect(stats.sunlitHours).toBeGreaterThan(300);
    expect(stats.sunlitHours).toBeLessThan(400);
    // Near side: Earth is up the whole time, so both-hours == sunlit hours.
    expect(stats.earthVisibleHours).toBeCloseTo(stats.windowHours, 0);
    expect(stats.bothHours).toBeCloseTo(stats.sunlitHours, 0);
    // The window starts at new moon (midnight at (0,0)), so the opening
    // dark stretch is about a quarter month (~177 h) until sunrise; the
    // sunlit stretch is about half a month (~354 h).
    expect(stats.longestSunlitStretchHours).toBeGreaterThan(300);
    expect(stats.longestSunlitStretchHours).toBeLessThan(400);
    expect(stats.longestDarkStretchHours).toBeGreaterThan(150);
    expect(stats.longestDarkStretchHours).toBeLessThan(200);
    expect(stats.samples.length).toBeGreaterThan(1000);
  });

  it('far side over a week: Earth never visible, Sun about half the time', () => {
    const stats = computeWindow(
      { latitude: 0, longitude: 180 },
      new Date('2026-11-13T00:00:00Z'),
      7,
    );
    expect(stats.earthVisibleHours).toBe(0);
    expect(stats.bothHours).toBe(0);
    expect(stats.sunlitHours).toBeGreaterThan(50);
    expect(stats.sunlitHours).toBeLessThan(120);
  });

  it('returns identical results from cache (same object)', () => {
    const site = { latitude: -85, longitude: 30 };
    const start = new Date('2026-11-13T00:00:00Z');
    const a = computeWindow(site, start, 7);
    const b = computeWindow(site, start, 7);
    expect(a).toBe(b);
  });
});
