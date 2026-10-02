import { describe, expect, it } from 'vitest';
import { COMPARE_FIELDS, differingKeys } from './compare';
import { missions, getMissionById } from './missions';

const byId = (id: string) => getMissionById(id)!;

describe('differingKeys', () => {
  it('flags fields that differ across the selection', () => {
    const keys = differingKeys([byId('to2-im'), byId('prime-1')]);
    expect(keys.has('status')).toBe(true);
    expect(keys.has('landingSite')).toBe(true);
  });

  it('does not flag fields with identical values', () => {
    const keys = differingKeys([byId('cp-22'), byId('ct-3')]);
    expect(keys.has('status')).toBe(false);
    expect(keys.has('provider')).toBe(true);
  });

  it('counts null vs value as a difference (rendered as "-")', () => {
    const keys = differingKeys([byId('to2-im'), byId('cs-8')]);
    expect(keys.has('provider')).toBe(true);
    expect(keys.has('lander')).toBe(true);
  });

  it('single mission has no differences', () => {
    expect(differingKeys([byId('to2-im')]).size).toBe(0);
  });

  it('covers every FR-6 field key', () => {
    expect(COMPARE_FIELDS.map((f) => f.key)).toEqual([
      'launchDate',
      'lander',
      'provider',
      'landingSite',
      'payloadCount',
      'status',
      'objective',
    ]);
    expect(missions.length).toBeGreaterThan(0);
  });
});
