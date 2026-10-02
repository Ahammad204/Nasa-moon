import { describe, expect, it } from 'vitest';
import { missions } from './missions';
import { searchMissions } from './search';
import type { Mission } from './types';

const fixture: Mission[] = missions.filter((m) =>
  ['to2-im', 'cs-8', 'cp-21'].includes(m.id)
) as Mission[];

describe('searchMissions (FR-2)', () => {
  it('empty or whitespace query returns everything', () => {
    expect(searchMissions(fixture, '')).toHaveLength(fixture.length);
    expect(searchMissions(fixture, '   ')).toHaveLength(fixture.length);
  });

  it('matches mission name case-insensitively', () => {
    expect(searchMissions(fixture, 'im-1').map((m) => m.id)).toEqual(['to2-im']);
    expect(searchMissions(fixture, 'IM-1').map((m) => m.id)).toEqual(['to2-im']);
  });

  it('matches lander', () => {
    expect(searchMissions(fixture, 'nova-c').map((m) => m.id)).toEqual(['to2-im']);
  });

  it('matches provider and does not crash on null provider/lander/site', () => {
    expect(searchMissions(fixture, 'intuitive').map((m) => m.id)).toEqual(['to2-im']);
    expect(searchMissions(fixture, 'firefly').map((m) => m.id)).toEqual(['cp-21']);
    expect(searchMissions(fixture, 'cs-8').map((m) => m.id)).toEqual(['cs-8']);
  });

  it('matches landing site', () => {
    expect(searchMissions(fixture, 'malapert').map((m) => m.id)).toEqual(['to2-im']);
  });

  it('matches payload names', () => {
    expect(searchMissions(fixture, 'scalpss').map((m) => m.id)).toContain('to2-im');
    expect(searchMissions(fixture, 'lunar-vise').map((m) => m.id)).toEqual(['cp-21']);
  });

  it('matches task order', () => {
    expect(searchMissions(fixture, 'cp-21').map((m) => m.id)).toEqual(['cp-21']);
  });

  it('returns empty array when nothing matches', () => {
    expect(searchMissions(fixture, 'zzz-no-such-mission')).toEqual([]);
  });
});
