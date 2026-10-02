import { launchYear } from './missions';
import type { Mission } from './types';

export interface Filters {
  status: string[];
  provider: string[];
  year: string[];
  region: string[];
}

export const EMPTY_FILTERS: Filters = { status: [], provider: [], year: [], region: [] };

export interface FilterOptions {
  status: string[];
  provider: string[];
  year: string[];
  region: string[];
}

function orEmpty(selected: string[], value: string | null): boolean {
  return selected.length === 0 || (value !== null && selected.includes(value));
}

export function filterMissions(missions: Mission[], filters: Filters): Mission[] {
  return missions.filter(
    (m) =>
      orEmpty(filters.status, m.status) &&
      orEmpty(filters.provider, m.provider) &&
      orEmpty(filters.year, launchYear(m) === null ? null : String(launchYear(m))) &&
      orEmpty(filters.region, m.landingSite?.region ?? null)
  );
}

function uniqueSorted(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => v !== null))].sort();
}

export function filterOptions(missions: Mission[]): FilterOptions {
  return {
    status: uniqueSorted(missions.map((m) => m.status)),
    provider: uniqueSorted(missions.map((m) => m.provider)),
    year: uniqueSorted(missions.map((m) => (launchYear(m) === null ? null : String(launchYear(m))))),
    region: uniqueSorted(missions.map((m) => m.landingSite?.region ?? null)),
  };
}

const GROUPS: (keyof Filters)[] = ['status', 'provider', 'year', 'region'];

// URL <-> filter state (FR-9): one comma-separated param per group.
export function filtersFromParams(getParam: (key: string) => string | null): Filters {
  const parse = (key: string) =>
    (getParam(key) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return { status: parse('status'), provider: parse('provider'), year: parse('year'), region: parse('region') };
}

export function filtersToParams(filters: Filters): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const g of GROUPS) out[g] = filters[g].length > 0 ? filters[g].join(',') : null;
  return out;
}
