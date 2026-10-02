import type { Mission, Payload } from './types';

export interface PayloadEntry {
  mission: Mission;
  payload: Payload;
}

export interface PayloadGroup {
  name: string;
  organizations: string[];
  entries: PayloadEntry[];
}

// Index derived from payloads[] (schema derived fields are computed, never stored).
// Groups by exact payload name as the sources spell it (name variants stay separate).
export function groupPayloads(missions: Mission[]): PayloadGroup[] {
  const groups = new Map<string, PayloadGroup>();
  for (const mission of missions) {
    for (const payload of mission.payloads) {
      const group = groups.get(payload.name) ?? {
        name: payload.name,
        organizations: [],
        entries: [],
      };
      group.entries.push({ mission, payload });
      if (payload.organization && !group.organizations.includes(payload.organization)) {
        group.organizations.push(payload.organization);
      }
      groups.set(payload.name, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
