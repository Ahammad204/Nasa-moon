import { describe, expect, it } from 'vitest';
import {
  MEAN_EARTH_MOON_KM,
  earthMoonLightTimeSeconds,
  earthMoonRoundTripSeconds,
  lightTimeSeconds,
  moonWeightRatio,
  roundTripLightTimeSeconds,
  weightOn,
} from './physics';

describe('moon physics (Science Context)', () => {
  it('20 kg weighs 32.48 N on the Moon and 196.13 N on Earth', () => {
    expect(weightOn('moon', 20)).toBeCloseTo(32.48, 2);
    expect(weightOn('earth', 20)).toBeCloseTo(196.13, 2);
  });

  it('1 kg weighs 1.62 N on the Moon and 9.81 N on Earth', () => {
    expect(weightOn('moon', 1)).toBeCloseTo(1.62, 2);
    expect(weightOn('earth', 1)).toBeCloseTo(9.81, 2);
  });

  it('0 kg weighs 0 N on both bodies', () => {
    expect(weightOn('moon', 0)).toBe(0);
    expect(weightOn('earth', 0)).toBe(0);
  });

  it('Moon/Earth weight ratio is about 0.1656', () => {
    expect(moonWeightRatio()).toBeCloseTo(0.1656, 4);
  });

  it('light time across the mean Earth–Moon distance is about 1.28 s one way, 2.56 s round trip', () => {
    expect(earthMoonLightTimeSeconds()).toBeCloseTo(1.28, 2);
    expect(earthMoonRoundTripSeconds()).toBeCloseTo(2.56, 2);
    expect(lightTimeSeconds(MEAN_EARTH_MOON_KM)).toBeCloseTo(1.282, 3);
    expect(roundTripLightTimeSeconds(MEAN_EARTH_MOON_KM)).toBeCloseTo(2.564, 3);
  });

  it('rejects negative and NaN input with clear errors', () => {
    expect(() => weightOn('moon', -5)).toThrow(/must not be negative/);
    expect(() => weightOn('earth', Number.NaN)).toThrow(/must be a number/);
    expect(() => lightTimeSeconds(-1)).toThrow(/must not be negative/);
    expect(() => lightTimeSeconds(Number.NaN)).toThrow(/must be a number/);
    expect(() => lightTimeSeconds(Infinity)).toThrow(/must be finite/);
  });
});
