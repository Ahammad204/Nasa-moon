import { describe, expect, it } from 'vitest';
import { computeWindow } from '../../lib/astro';
import { nextEventFromSamples } from './eventFromSamples';

const APOLLO_11 = { latitude: 0.674, longitude: 23.473 };
const NEAR_EQUATOR = { latitude: 0, longitude: 0 };
const FAR_SIDE = { latitude: 0, longitude: 180 };

describe('nextEventFromSamples', () => {
  it('finds the sunset after the Apollo 11 landing (Sun was up at landing)', () => {
    const start = new Date('1969-07-20T20:17:00Z');
    const stats = computeWindow(APOLLO_11, start, 14, 30);
    const sunset = nextEventFromSamples(stats.samples, start, 'sun', 'set', APOLLO_11);
    expect(sunset).not.toBeNull();
    const days = (sunset!.getTime() - start.getTime()) / 86_400_000;
    // Landing was ~2 days after local sunrise; sunset follows ~12 days later.
    expect(days).toBeGreaterThan(5);
    expect(days).toBeLessThan(15);
  });

  it('finds the next sunrise after sunset at Apollo 11', () => {
    const start = new Date('1969-07-20T20:17:00Z');
    const stats = computeWindow(APOLLO_11, start, 29.5, 30);
    const sunset = nextEventFromSamples(stats.samples, start, 'sun', 'set', APOLLO_11)!;
    const sunrise = nextEventFromSamples(
      stats.samples,
      new Date(sunset.getTime() + 60_000),
      'sun',
      'rise',
      APOLLO_11,
    );
    expect(sunrise).not.toBeNull();
    expect(sunrise!.getTime()).toBeGreaterThan(sunset.getTime());
  });

  it('returns null for Earth rise/set on the far side (Earth never visible)', () => {
    const start = new Date('2026-11-13T00:00:00Z');
    const stats = computeWindow(FAR_SIDE, start, 29.5, 30);
    expect(stats.earthVisibleHours).toBe(0);
    expect(
      nextEventFromSamples(stats.samples, start, 'earth', 'rise', FAR_SIDE),
    ).toBeNull();
    expect(
      nextEventFromSamples(stats.samples, start, 'earth', 'set', FAR_SIDE),
    ).toBeNull();
  });

  it('returns null for Earthset on the near side (Earth essentially never sets)', () => {
    const start = new Date('2026-11-13T00:00:00Z');
    const stats = computeWindow(NEAR_EQUATOR, start, 29.5, 30);
    expect(stats.earthVisibleHours).toBeGreaterThan(29 * 24);
    expect(
      nextEventFromSamples(stats.samples, start, 'earth', 'set', NEAR_EQUATOR),
    ).toBeNull();
  });
});
