import type { Mission } from './types';

function haystack(m: Mission): string {
  return [
    m.name,
    m.taskOrder,
    m.lander,
    m.provider,
    m.landingSite?.name,
    ...m.payloads.map((p) => p.name),
  ]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .toLowerCase();
}

export function searchMissions(missions: Mission[], query: string): Mission[] {
  const q = query.trim().toLowerCase();
  if (!q) return missions;
  return missions.filter((m) => haystack(m).includes(q));
}
