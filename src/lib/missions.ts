import missionsData from '../data/missions.json';
import type { Mission } from './types';

// Hides the JSON import: components never touch the raw file (RULES §3).
// The cast is safe because validate.test.ts checks every record against the schema.
export const missions: Mission[] = missionsData as unknown as Mission[];

export function getMissionById(id: string): Mission | undefined {
  return missions.find((m) => m.id === id);
}

export function launchYear(m: Mission): number | null {
  return m.launchDate ? Number(m.launchDate.slice(0, 4)) : null;
}

export function payloadCount(m: Mission): number | null {
  return m.payloads.length > 0 ? m.payloads.length : m.payloadCountReported;
}

export function payloadCountDiffers(m: Mission): boolean {
  return m.payloadCountReported !== null && m.payloadCountReported !== m.payloads.length;
}

export function hasMapPosition(m: Mission): boolean {
  return m.landingSite?.latitude != null && m.landingSite.longitude != null;
}
