import { payloadCount } from './missions';
import type { Mission } from './types';

export interface CompareField {
  key: string;
  label: string;
  value: (m: Mission) => string;
}

// FR-6 fields, in the fixed order used by both the table and the stacked cards.
export const COMPARE_FIELDS: CompareField[] = [
  { key: 'launchDate', label: 'Launch date', value: (m) => m.launchDate ?? '-' },
  { key: 'lander', label: 'Lander', value: (m) => m.lander ?? '-' },
  { key: 'provider', label: 'Provider', value: (m) => m.provider ?? '-' },
  { key: 'landingSite', label: 'Landing site', value: (m) => m.landingSite?.name ?? '-' },
  {
    key: 'payloadCount',
    label: 'Payload count',
    value: (m) => String(payloadCount(m) ?? '-'),
  },
  { key: 'status', label: 'Status', value: (m) => m.status },
  { key: 'objective', label: 'Objective', value: (m) => m.objective ?? '-' },
];

// Field keys whose values differ across the selection (null vs value counts as different).
export function differingKeys(missions: Mission[]): Set<string> {
  const out = new Set<string>();
  for (const f of COMPARE_FIELDS) {
    const values = missions.map(f.value);
    if (new Set(values).size > 1) out.add(f.key);
  }
  return out;
}
