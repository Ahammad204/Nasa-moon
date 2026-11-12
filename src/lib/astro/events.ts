/**
 * Rise/set event search for the Sun and Earth at a lunar site.
 *
 * Method: scan forward in 30-minute steps (up to `windowDays` ahead), then
 * refine the first sign change by bisection to about 1 minute (6 bisection
 * steps halve a 30-minute bracket to under 30 seconds).
 *
 * Returns null when no crossing happens inside the window: the Earth never
 * sets on the near side, the Sun can stay up for months at the poles
 * (polar day). A null is a real answer, not a failure — callers must say
 * so ("Sun stays up through the window", "Earth never visible").
 */
import { getSunEarthState } from './geometry';
import type { Site } from './geometry';

export type SkyBody = 'sun' | 'earth';
export type EventKind = 'rise' | 'set';

/** Default scan horizon: one lunar day (29.53 d) plus margin. */
export const DEFAULT_EVENT_WINDOW_DAYS = 40;
/** Scan step (minutes). */
const SCAN_STEP_MINUTES = 30;

function elevationAt(site: Site, date: Date, body: SkyBody, sunDisc: boolean): number {
  const state = getSunEarthState(site, date, sunDisc);
  return body === 'sun' ? state.sun.elevation : state.earth.elevation;
}

export interface FindNextEventOptions {
  /** Scan horizon in days (default 40). */
  windowDays?: number;
  /** Judge "Sun up" by its upper limb instead of its centre. */
  sunDisc?: boolean;
}

/**
 * Next rise/set of a body at a site, scanning forward from `from`.
 * 1-minute precision; null when no crossing occurs in the window.
 */
export function findNextEvent(
  site: Site,
  from: Date,
  body: SkyBody,
  kind: EventKind,
  options: FindNextEventOptions = {},
): Date | null {
  const windowDays = options.windowDays ?? DEFAULT_EVENT_WINDOW_DAYS;
  const sunDisc = options.sunDisc ?? false;
  const rising = kind === 'rise';
  const stepMs = SCAN_STEP_MINUTES * 60 * 1000;
  const maxMs = windowDays * 24 * 60 * 60 * 1000;
  const startMs = from.getTime();
  let prevTime = startMs;
  let prevAlt = elevationAt(site, new Date(prevTime), body, sunDisc);
  for (let t = startMs + stepMs; t <= startMs + maxMs; t += stepMs) {
    const alt = elevationAt(site, new Date(t), body, sunDisc);
    const crossed = rising ? prevAlt < 0 && alt >= 0 : prevAlt >= 0 && alt < 0;
    if (crossed) {
      let lo = prevTime;
      let hi = t;
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        const midAlt = elevationAt(site, new Date(mid), body, sunDisc);
        const midAbove = midAlt >= 0;
        if (rising ? midAbove : !midAbove) hi = mid;
        else lo = mid;
      }
      return new Date(hi);
    }
    prevTime = t;
    prevAlt = alt;
  }
  return null;
}

/**
 * Milliseconds from `from` until the next sunset, or null when the Sun
 * does not set inside the scan window (polar day).
 */
export function timeToSunset(site: Site, from: Date, sunDisc = false): number | null {
  const at = findNextEvent(site, from, 'sun', 'set', { sunDisc });
  return at === null ? null : at.getTime() - from.getTime();
}

/**
 * Milliseconds from `from` until the next Earthset, or null when the Earth
 * does not set inside the scan window (near side: essentially never).
 */
export function timeToEarthset(site: Site, from: Date): number | null {
  const at = findNextEvent(site, from, 'earth', 'set');
  return at === null ? null : at.getTime() - from.getTime();
}
