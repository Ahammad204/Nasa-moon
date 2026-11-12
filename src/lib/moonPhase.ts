/**
 * Moon phase helpers for the "Moon Right Now" homepage section.
 *
 * All values come from the `astronomy-engine` package at runtime
 * (MoonPhase / Illumination / SearchMoonPhase) — nothing here is a
 * hard-coded date or value. This file only turns a phase angle
 * (0–360°, 0 = new moon) into a name and an SVG lit-region path.
 */

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

/** Standard 8-way phase name from the ecliptic longitude difference (degrees). */
export function phaseName(phaseDeg: number): MoonPhaseName {
  const p = ((phaseDeg % 360) + 360) % 360;
  if (p < 22.5 || p >= 337.5) return 'New Moon';
  if (p < 67.5) return 'Waxing Crescent';
  if (p < 112.5) return 'First Quarter';
  if (p < 157.5) return 'Waxing Gibbous';
  if (p < 202.5) return 'Full Moon';
  if (p < 247.5) return 'Waning Gibbous';
  if (p < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

/**
 * SVG path for the illuminated part of the Moon, as seen from Earth
 * (northern-hemisphere view: waxing lit on the right, waning on the left).
 * The disc is centred at (0, 0) with radius `r`. The terminator is an
 * ellipse whose horizontal radius is r·|cos(phase)| — a semicircle at the
 * quarters, a straight line at new/full.
 */
export function moonLitPath(phaseDeg: number, r: number): string {
  const p = ((phaseDeg % 360) + 360) % 360;
  const theta = (p * Math.PI) / 180;
  const rx = Math.abs(Math.cos(theta)) * r;
  const waxing = p < 180;
  // Gibbous (phase past the quarter) bulges the terminator outward;
  // crescent curves it inward. The sweep flag picks the arc side.
  const gibbous = (waxing && p > 90) || (!waxing && p < 270);
  if (waxing) {
    // Right semicircle (top -> bottom), then the terminator back up.
    return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx.toFixed(2)} ${r} 0 0 ${gibbous ? 1 : 0} 0 ${-r} Z`;
  }
  // Left semicircle (bottom -> top), then the terminator back down.
  return `M 0 ${r} A ${r} ${r} 0 0 1 0 ${-r} A ${rx.toFixed(2)} ${r} 0 0 ${gibbous ? 0 : 1} 0 ${r} Z`;
}

/** Short UTC date, e.g. "24 Nov 2026". */
export function fmtDateUtc(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
