import { describe, expect, it } from 'vitest';
import { centerIndex, clampIndex } from './carousel';

describe('centerIndex', () => {
  it('returns -1 with no cards', () => {
    expect(centerIndex([], 100)).toBe(-1);
  });

  it('returns 0 for a single card', () => {
    expect(centerIndex([200], 0)).toBe(0);
    expect(centerIndex([200], 9999)).toBe(0);
  });

  it('picks the card whose centre is nearest the viewport centre', () => {
    // Three 420px cards, 12px gaps: centres at 210, 642, 1074.
    expect(centerIndex([210, 642, 1074], 210)).toBe(0);
    expect(centerIndex([210, 642, 1074], 600)).toBe(1);
    expect(centerIndex([210, 642, 1074], 1074)).toBe(2);
    expect(centerIndex([210, 642, 1074], 900)).toBe(2);
    expect(centerIndex([210, 642, 1074], 300)).toBe(0);
  });

  it('earlier card wins an exact tie', () => {
    expect(centerIndex([100, 300], 200)).toBe(0);
  });
});

describe('clampIndex', () => {
  it('returns -1 with no cards', () => {
    expect(clampIndex(0, 0)).toBe(-1);
    expect(clampIndex(2, 0)).toBe(-1);
  });

  it('clamps below 0 and above the last index', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(3, 3)).toBe(2);
    expect(clampIndex(99, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });
});
