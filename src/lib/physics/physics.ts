// Moon physics engine (Science Context, Phase 4).
// Pure TypeScript, no React, no DOM. All constants come from
// src/data/moon-constants.json (NASA Moon Facts); the numbers below are
// the same values, kept here so the pure functions stay dependency-free.

/** Surface gravity used for weight calculations, m/s². */
export const MOON_GRAVITY = 1.624;
/** Standard Earth surface gravity, m/s². */
export const EARTH_GRAVITY = 9.80665;
/** Speed of light in vacuum, km/s. */
export const SPEED_OF_LIGHT_KM_S = 299792.458;
/** Mean Earth–Moon distance, km. */
export const MEAN_EARTH_MOON_KM = 384400;

export type GravityBody = 'moon' | 'earth';

function assertFiniteNonNegative(value: number, name: string): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${name} must be a number, got ${String(value)}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite, got ${String(value)}`);
  }
  if (value < 0) {
    throw new Error(`${name} must not be negative, got ${value}`);
  }
}

/**
 * Weight (force) in newtons for a mass on the Moon or Earth.
 * Moon/Earth ratio is about 0.1656 (1.624 / 9.80665).
 */
export function weightOn(body: GravityBody, massKg: number): number {
  assertFiniteNonNegative(massKg, 'massKg');
  return massKg * (body === 'moon' ? MOON_GRAVITY : EARTH_GRAVITY);
}

/** Moon weight as a fraction of Earth weight (about 0.1656). */
export function moonWeightRatio(): number {
  return MOON_GRAVITY / EARTH_GRAVITY;
}

/** One-way light travel time in seconds for a distance in km. */
export function lightTimeSeconds(distanceKm: number): number {
  assertFiniteNonNegative(distanceKm, 'distanceKm');
  return distanceKm / SPEED_OF_LIGHT_KM_S;
}

/** Round-trip light travel time in seconds for a distance in km. */
export function roundTripLightTimeSeconds(distanceKm: number): number {
  return lightTimeSeconds(distanceKm) * 2;
}

/** Light time across the mean Earth–Moon distance, one way (~1.282 s). */
export function earthMoonLightTimeSeconds(): number {
  return lightTimeSeconds(MEAN_EARTH_MOON_KM);
}

/** Light time across the mean Earth–Moon distance, round trip (~2.564 s). */
export function earthMoonRoundTripSeconds(): number {
  return roundTripLightTimeSeconds(MEAN_EARTH_MOON_KM);
}
