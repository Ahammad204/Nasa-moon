/**
 * Window statistics over a date range: sunlight hours, Earth-visible hours,
 * hours with both up, longest sunlit / dark stretches.
 *
 * The sub-solar and sub-Earth points depend only on time, not on the site,
 * so they are computed once per (start, days, step) and shared across sites
 * (and cached). Per-site work is then cheap spherical trigonometry.
 *
 * Results are cached in module memory, keyed by site + start + days + step.
 * The cache is bounded (oldest entries evicted past 64) so long sessions
 * cannot grow it without limit.
 */
import { getSunEarthState } from './geometry';
import { getSubEarthPoint, getSubSolarPoint } from './subPoints';
import type { Site } from './geometry';
import type { SelenographicPoint } from './subPoints';

export interface WindowSample {
  t: Date;
  sunEl: number;
  earthEl: number;
}

export interface WindowStats {
  samples: WindowSample[];
  /** Hours with the Sun above the horizon. */
  sunlitHours: number;
  /** Hours with the Earth above the horizon. */
  earthVisibleHours: number;
  /** Hours with Sun AND Earth up — the powered, communicating state. */
  bothHours: number;
  /** Longest continuous sunlit stretch, hours. */
  longestSunlitStretchHours: number;
  /** Longest continuous dark stretch, hours. */
  longestDarkStretchHours: number;
  /** Total window length, hours. */
  windowHours: number;
}

const DEG_TO_RAD = Math.PI / 180;

const MAX_CACHE_ENTRIES = 64;
const subPointCache = new Map<string, { sun: SelenographicPoint; earth: SelenographicPoint }[]>();
const statsCache = new Map<string, WindowStats>();

function subPointCacheKey(start: Date, days: number, stepMinutes: number): string {
  return `${start.toISOString()}|${days}|${stepMinutes}`;
}

function statsCacheKey(site: Site, start: Date, days: number, stepMinutes: number): string {
  return `${site.latitude},${site.longitude}|${subPointCacheKey(start, days, stepMinutes)}`;
}

function evictOldest(map: Map<string, unknown>): void {
  if (map.size <= MAX_CACHE_ENTRIES) return;
  const first = map.keys().next().value;
  if (first !== undefined) map.delete(first);
}

function subPointsForWindow(start: Date, days: number, stepMinutes: number) {
  const key = subPointCacheKey(start, days, stepMinutes);
  const hit = subPointCache.get(key);
  if (hit) return hit;
  const steps = Math.max(1, Math.round((days * 24 * 60) / stepMinutes));
  const points: { sun: SelenographicPoint; earth: SelenographicPoint }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(start.getTime() + i * stepMinutes * 60 * 1000);
    points.push({ sun: getSubSolarPoint(t), earth: getSubEarthPoint(t) });
  }
  subPointCache.set(key, points);
  evictOldest(subPointCache);
  return points;
}

function elevationFromSub(site: Site, sub: SelenographicPoint): number {
  const phi = site.latitude * DEG_TO_RAD;
  const lambda = site.longitude * DEG_TO_RAD;
  const phiB = sub.latitude * DEG_TO_RAD;
  const lambdaB = sub.longitude * DEG_TO_RAD;
  const sinEl =
    Math.sin(phi) * Math.sin(phiB) +
    Math.cos(phi) * Math.cos(phiB) * Math.cos(lambda - lambdaB);
  return Math.asin(Math.max(-1, Math.min(1, sinEl))) * (180 / Math.PI);
}

/**
 * Sun/Earth elevation samples plus totals over [start, start + days).
 * `sunDisc` judges "Sun up" by the upper limb (+0.27 deg) when true.
 */
export function computeWindow(
  site: Site,
  start: Date,
  days: number,
  stepMinutes = 30,
  sunDisc = false,
): WindowStats {
  const key = statsCacheKey(site, start, days, stepMinutes) + (sunDisc ? '|disc' : '');
  const hit = statsCache.get(key);
  if (hit) return hit;

  const points = subPointsForWindow(start, days, stepMinutes);
  const stepHours = stepMinutes / 60;
  const samples: WindowSample[] = [];
  let sunlit = 0;
  let earthVisible = 0;
  let both = 0;
  let longestSunlit = 0;
  let longestDark = 0;
  let runSunlit = 0;
  let runDark = 0;
  const sunUpAt = (sunEl: number) => (sunDisc ? sunEl + 0.27 : sunEl) >= 0;

  for (let i = 0; i < points.length; i++) {
    const t = new Date(start.getTime() + i * stepMinutes * 60 * 1000);
    const sunEl = elevationFromSub(site, points[i].sun);
    const earthEl = elevationFromSub(site, points[i].earth);
    samples.push({ t, sunEl, earthEl });
    // The last sample is the window's end instant; it does not own a step.
    if (i === points.length - 1) break;
    const sunUp = sunUpAt(sunEl);
    const earthUp = earthEl >= 0;
    if (sunUp) sunlit += stepHours;
    if (earthUp) earthVisible += stepHours;
    if (sunUp && earthUp) both += stepHours;
    if (sunUp) {
      runSunlit += stepHours;
      runDark = 0;
      longestSunlit = Math.max(longestSunlit, runSunlit);
    } else {
      runDark += stepHours;
      runSunlit = 0;
      longestDark = Math.max(longestDark, runDark);
    }
  }

  const stats: WindowStats = {
    samples,
    sunlitHours: sunlit,
    earthVisibleHours: earthVisible,
    bothHours: both,
    longestSunlitStretchHours: longestSunlit,
    longestDarkStretchHours: longestDark,
    windowHours: days * 24,
  };
  statsCache.set(key, stats);
  evictOldest(statsCache);
  return stats;
}

/** Test helper: clear both caches. */
export function clearAstroCache(): void {
  subPointCache.clear();
  statsCache.clear();
}

/** Re-exported for callers that need a one-shot state (used by the 3D scene). */
export { getSunEarthState };
