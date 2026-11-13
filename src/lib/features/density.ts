// Lunar Feature Explorer — heat-map density colour scale (Phase 3b).
//
// Density is features per 1000 km^2 of TRUE spherical cell area (see
// engine.binToGrid). The scale is log-normalised — raw counts span two
// orders of magnitude, so a linear scale would paint almost every cell
// the same faint colour — and runs dark blue -> blue -> cyan -> amber ->
// orange so it stays readable on the dark WAC basemap. A cell's colour
// is never its only signal: hover/click always shows the numeric count
// and density.

const STOPS: Array<{ t: number; rgb: [number, number, number] }> = [
  { t: 0, rgb: [15, 28, 46] }, // #0f1c2e — faintest, barely above the basemap
  { t: 0.25, rgb: [29, 78, 216] }, // #1d4ed8
  { t: 0.5, rgb: [8, 145, 178] }, // #0891b2
  { t: 0.75, rgb: [234, 179, 8] }, // #eab308
  { t: 1, rgb: [249, 115, 22] }, // #f97316 — densest
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Log-normalised position of a density in [0, maxDensity]. */
export function densityT(densityPer1000Km2: number, maxDensity: number): number {
  if (!Number.isFinite(densityPer1000Km2) || densityPer1000Km2 <= 0) return 0;
  if (!Number.isFinite(maxDensity) || maxDensity <= 0) return 0;
  return Math.log1p(densityPer1000Km2) / Math.log1p(maxDensity);
}

export function densityColor(densityPer1000Km2: number, maxDensity: number): string {
  const t = Math.min(1, Math.max(0, densityT(densityPer1000Km2, maxDensity)));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      const prev = STOPS[i - 1];
      const next = STOPS[i];
      const local = (t - prev.t) / (next.t - prev.t || 1);
      const r = lerp(prev.rgb[0], next.rgb[0], local);
      const g = lerp(prev.rgb[1], next.rgb[1], local);
      const b = lerp(prev.rgb[2], next.rgb[2], local);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = STOPS[STOPS.length - 1].rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

export function formatDensity(densityPer1000Km2: number): string {
  if (densityPer1000Km2 >= 100) return densityPer1000Km2.toFixed(0);
  if (densityPer1000Km2 >= 10) return densityPer1000Km2.toFixed(1);
  return densityPer1000Km2.toFixed(2);
}

/**
 * Five legend buckets, log-spaced across [0, maxDensity]. Each entry is
 * the bucket's upper density bound with its swatch colour.
 */
export function densityLegendBuckets(maxDensity: number): Array<{
  color: string;
  label: string;
}> {
  if (!Number.isFinite(maxDensity) || maxDensity <= 0) return [];
  const fractions = [0.2, 0.4, 0.6, 0.8, 1];
  // Inverse of densityT: d = expm1(t * log1p(max)). (expm1 already
  // returns e^x - 1, so no further subtraction.)
  const bound = (f: number): number => Math.expm1(f * Math.log1p(maxDensity));
  return fractions.map((f, i) => {
    const upper = bound(f);
    const lower = i === 0 ? 0 : bound(fractions[i - 1]);
    return {
      color: densityColor(upper, maxDensity),
      label: `${formatDensity(Math.max(0, lower))}–${formatDensity(upper)}`,
    };
  });
}
