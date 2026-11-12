import { describe, expect, it } from 'vitest';
import { quickMapUrl } from './quickmap';

describe('quickMapUrl (Science Context, Phase 5d)', () => {
  it('builds an extent link centred on the site', () => {
    expect(quickMapUrl(-89.67, 129.78)).toBe(
      'https://quickmap.lroc.asu.edu/?extent=128.78,-90,130.78,-88.67&proj=10',
    );
  });

  it('clamps latitude to the poles and longitude to ±180', () => {
    // Shackleton: the -1° span would run past the south pole without clamping.
    expect(quickMapUrl(-89.67, 129.78)).toContain(',-90,');
    expect(quickMapUrl(0, 179.5, 1)).toBe(
      'https://quickmap.lroc.asu.edu/?extent=178.5,-1,180,1&proj=10',
    );
  });

  it('respects a custom half-span', () => {
    expect(quickMapUrl(9.62, -20.08, 2)).toBe(
      'https://quickmap.lroc.asu.edu/?extent=-22.08,7.62,-18.08,11.62&proj=10',
    );
  });
});
