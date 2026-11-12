import { describe, expect, it } from 'vitest';
import { fmtDateUtc, moonLitPath, phaseName } from './moonPhase';

describe('phaseName', () => {
  it('names the four quarters', () => {
    expect(phaseName(0)).toBe('New Moon');
    expect(phaseName(90)).toBe('First Quarter');
    expect(phaseName(180)).toBe('Full Moon');
    expect(phaseName(270)).toBe('Last Quarter');
  });
  it('names the in-between phases', () => {
    expect(phaseName(45)).toBe('Waxing Crescent');
    expect(phaseName(135)).toBe('Waxing Gibbous');
    expect(phaseName(225)).toBe('Waning Gibbous');
    expect(phaseName(315)).toBe('Waning Crescent');
  });
  it('wraps out-of-range angles', () => {
    expect(phaseName(360)).toBe('New Moon');
    expect(phaseName(-10)).toBe('New Moon'); // -10° ≡ 350°, within 22.5° of new
    expect(phaseName(-30)).toBe('Waning Crescent'); // -30° ≡ 330°
  });
});

describe('moonLitPath', () => {
  it('terminator radius follows |cos(phase)|: full disc at full moon, empty at new moon', () => {
    // At new (0°) and full (180°) the terminator ellipse coincides with
    // the limb (rx = r); at the quarters (90°/270°) it is a straight line.
    expect(moonLitPath(0, 50)).toContain('A 50.00 50');
    expect(moonLitPath(180, 50)).toContain('A 50.00 50');
    expect(moonLitPath(90, 50)).toContain('A 0.00 50');
    expect(moonLitPath(270, 50)).toContain('A 0.00 50');
  });
  it('waxes on the right, wanes on the left', () => {
    // Waxing: path starts with the right semicircle (top -> bottom).
    expect(moonLitPath(45, 50)).toMatch(/^M 0 -50 A 50 50 0 0 1 0 50/);
    // Waning: path starts with the left semicircle (bottom -> top).
    expect(moonLitPath(315, 50)).toMatch(/^M 0 50 A 50 50 0 0 1 0 -50/);
  });
});

describe('fmtDateUtc', () => {
  it('formats in UTC regardless of local zone', () => {
    expect(fmtDateUtc(new Date('2026-11-24T14:54:04.191Z'))).toBe('24 Nov 2026');
  });
});
