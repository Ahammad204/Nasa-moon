import type { Mission } from './types';

export interface ChartDatum {
  name: string;
  count: number;
}

export function countBy(missions: Mission[], key: (m: Mission) => string | null): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const m of missions) {
    const name = key(m) ?? 'unknown';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function countByStatus(missions: Mission[]): ChartDatum[] {
  return countBy(missions, (m) => m.status);
}

export function countByProvider(missions: Mission[]): ChartDatum[] {
  return countBy(missions, (m) => m.provider);
}
