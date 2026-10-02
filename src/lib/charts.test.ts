import { describe, expect, it } from 'vitest';
import { countBy, countByProvider, countByStatus } from './charts';
import { missions } from './missions';

describe('chart counts', () => {
  it('counts by status', () => {
    const data = countByStatus(missions);
    const upcoming = data.find((d) => d.name === 'upcoming');
    expect(upcoming?.count).toBe(11);
    expect(data.reduce((sum, d) => sum + d.count, 0)).toBe(missions.length);
  });

  it('counts by provider and labels null providers as unknown', () => {
    const data = countByProvider(missions);
    expect(data.find((d) => d.name === 'Intuitive Machines')?.count).toBe(5);
    expect(data.find((d) => d.name === 'unknown')?.count).toBe(2);
  });

  it('sorts by count descending then name', () => {
    const data = countBy(missions, (m) => m.status);
    for (let i = 1; i < data.length; i += 1) {
      expect(data[i - 1].count).toBeGreaterThanOrEqual(data[i].count);
    }
  });
});
