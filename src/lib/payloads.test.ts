import { describe, expect, it } from 'vitest';
import { missions } from './missions';
import { groupPayloads } from './payloads';

describe('groupPayloads (FR-10)', () => {
  const groups = groupPayloads(missions);

  it('groups by exact payload name and sorts alphabetically', () => {
    const names = groups.map((g) => g.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });

  it('cross-references every mission that carried a payload', () => {
    const lra = groups.find((g) => g.name === 'LRA (Laser Retroreflector Array)');
    expect(lra?.entries.map((e) => e.mission.id).sort()).toEqual(['cp-22', 'cs-6', 'ct-3']);
    expect(lra?.organizations).toContain('GSFC');
  });

  it('keeps name variants separate (sources are verbatim)', () => {
    const variants = groups.filter((g) => g.name.toLowerCase().includes('retroreflector'));
    expect(variants.length).toBeGreaterThan(1);
  });

  it('covers every payload in the dataset', () => {
    const total = missions.reduce((sum, m) => sum + m.payloads.length, 0);
    const entries = groups.reduce((sum, g) => sum + g.entries.length, 0);
    expect(entries).toBe(total);
  });
});
