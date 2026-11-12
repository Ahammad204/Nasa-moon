import { getSunEarthState } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import type { WindowSample } from '../../lib/astro';

/**
 * Next rise/set of a body after `from`, bracketed by already-computed window
 * samples instead of a fresh 40-day scan: the samples (30-minute steps) pin
 * the crossing to one bracket, then bisection refines it to ~1 minute.
 *
 * This is the same method as astro `findNextEvent` (scan + bisection), just
 * with the scan step replaced by samples the caller already has — so a
 * slider scrub or a playing playhead can refresh "time to sunset" without a
 * multi-hundred-millisecond scan on every tick.
 *
 * Returns null when no crossing of that kind happens inside the sampled
 * window: the Sun can stay up for months at the poles (polar day), and the
 * Earth never sets on the near side. Null is a real answer, not a failure.
 */
export type SkyBody = 'sun' | 'earth';
export type EventKind = 'rise' | 'set';

function elevationAt(
  site: Site,
  date: Date,
  body: SkyBody,
  sunDisc: boolean,
): number {
  const state = getSunEarthState(site, date, sunDisc);
  if (body === 'sun') {
    return sunDisc ? state.sunUpperLimbElevation : state.sun.elevation;
  }
  return state.earth.elevation;
}

export function nextEventFromSamples(
  samples: WindowSample[],
  from: Date,
  body: SkyBody,
  kind: EventKind,
  site: Site,
  sunDisc = false,
): Date | null {
  if (samples.length < 2) return null;
  const rising = kind === 'rise';
  const elAt = (s: WindowSample) =>
    body === 'sun' ? (sunDisc ? s.sunEl + 0.27 : s.sunEl) : s.earthEl;
  const fromMs = from.getTime();

  for (let i = 0; i < samples.length; i++) {
    const tMs = samples[i].t.getTime();
    if (tMs <= fromMs) continue;
    const prev = i === 0 ? null : samples[i - 1];
    // Before the first sample there is no bracket — use the sample itself
    // as the "previous" elevation only when `from` is at/before it.
    const prevEl = prev === null ? elAt(samples[0]) : elAt(prev);
    const prevMs = prev === null ? fromMs : prev.t.getTime();
    const el = elAt(samples[i]);
    const crossed = rising ? prevEl < 0 && el >= 0 : prevEl >= 0 && el < 0;
    if (!crossed) continue;
    // Bisect [prevMs, tMs] to ~1 minute (7 steps halve 30 min to ~14 s).
    let lo = prevMs;
    let hi = tMs;
    for (let step = 0; step < 7; step++) {
      const mid = (lo + hi) / 2;
      const midAbove = elevationAt(site, new Date(mid), body, sunDisc) >= 0;
      if (rising ? midAbove : !midAbove) hi = mid;
      else lo = mid;
    }
    return new Date(hi);
  }
  return null;
}
