// Moon constants dataset (Science Context, Phase 4).
// Values from NASA Moon Facts; every record carries its sources and
// lastVerified. The physics engine uses the same numbers.
import constantsData from '../data/moon-constants.json';

export interface MoonConstant {
  id: string;
  label: string;
  value: number;
  unit: string;
  display: string;
  calcValue?: number;
  note?: string;
  sourceIds: string[];
  lastVerified: string;
}

export const moonConstants: MoonConstant[] =
  constantsData as unknown as MoonConstant[];

export function getMoonConstantById(id: string): MoonConstant | undefined {
  return moonConstants.find((c) => c.id === id);
}
