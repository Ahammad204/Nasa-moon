// Lunar Feature Explorer — density scale tests (Phase 3b).
//
// Guards the legend math: bucket bounds must be strictly increasing and
// end exactly at the densest cell (a previous version subtracted 1 from
// expm1 and produced duplicate/negative bounds).
import { describe, expect, it } from 'vitest';
import { densityColor, densityLegendBuckets, densityT, formatDensity } from './density';

describe('density scale', () => {
  it('normalises 0 to 0 and the max to 1', () => {
    expect(densityT(0, 3.99)).toBe(0);
    expect(densityT(3.99, 3.99)).toBeCloseTo(1);
    expect(densityT(1, 0)).toBe(0);
  });

  it('colours the extremes with the end stops', () => {
    expect(densityColor(0, 3.99)).toBe('rgb(15, 28, 46)');
    expect(densityColor(3.99, 3.99)).toBe('rgb(249, 115, 22)');
  });

  it('legend buckets are strictly increasing and end at the max', () => {
    const buckets = densityLegendBuckets(3.99);
    expect(buckets).toHaveLength(5);
    const uppers = buckets.map((b) => Number(b.label.split('–')[1]));
    expect(uppers[0]).toBeGreaterThan(0);
    for (let i = 1; i < uppers.length; i++) {
      expect(uppers[i]).toBeGreaterThan(uppers[i - 1]);
    }
    expect(uppers[uppers.length - 1]).toBeCloseTo(3.99, 1);
    expect(buckets[0].label.startsWith('0.00–')).toBe(true);
  });

  it('formats densities with scale-appropriate precision', () => {
    expect(formatDensity(150)).toBe('150');
    expect(formatDensity(12.34)).toBe('12.3');
    expect(formatDensity(0.379)).toBe('0.38');
  });
});
