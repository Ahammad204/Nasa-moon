/**
 * Site-conditions comparison (Phase 3).
 *
 * Pure logic: for each compared mission, run the Phase 1 astronomy window
 * over a shared date/window and derive the headline metrics — sunlight
 * hours, Earth-visible hours, hours with both up, longest sunlit/dark
 * stretches — plus power/comms ranks. Missions without verified coordinates
 * get no numbers at all (never a guessed value).
 */
import { computeWindow } from './astro';
import type { WindowStats } from './astro';
import { hasMapPosition } from './missions';
import type { Mission } from './types';

export interface SiteCondition {
  mission: Mission;
  /** False when the mission has no verified coordinates. */
  hasCoords: boolean;
  /** Null when hasCoords is false. */
  stats: WindowStats | null;
  /** Sunlit share of the window, 0..100 (0 when no coordinates). */
  sunlitPct: number;
  /** Earth-visible share of the window, 0..100. */
  earthPct: number;
  /** Share with Sun AND Earth up, 0..100. */
  bothPct: number;
  /** 1 = most sunlight; null when no coordinates. Ties share a rank. */
  powerRank: number | null;
  /** 1 = most Earth-visible time; null when no coordinates. */
  commsRank: number | null;
}

/** Dense ranking on a numeric key (equal values share a rank). */
function assignRanks(
  rows: SiteCondition[],
  key: 'sunlitPct' | 'earthPct',
  rankKey: 'powerRank' | 'commsRank',
): void {
  const ranked = rows
    .filter((r) => r.hasCoords)
    .sort((a, b) => b[key] - a[key]);
  let rank = 0;
  let prev: number | null = null;
  for (const row of ranked) {
    if (prev === null || row[key] < prev) rank += 1;
    row[rankKey] = rank;
    prev = row[key];
  }
}

export function computeSiteConditions(
  missions: Mission[],
  start: Date,
  days: number,
  sunDisc = false,
): SiteCondition[] {
  const windowHours = days * 24;
  const rows: SiteCondition[] = missions.map((mission) => {
    if (!hasMapPosition(mission)) {
      return {
        mission,
        hasCoords: false,
        stats: null,
        sunlitPct: 0,
        earthPct: 0,
        bothPct: 0,
        powerRank: null,
        commsRank: null,
      };
    }
    const site = {
      latitude: mission.landingSite!.latitude!,
      longitude: mission.landingSite!.longitude!,
    };
    const stats = computeWindow(site, start, days, 30, sunDisc);
    return {
      mission,
      hasCoords: true,
      stats,
      sunlitPct: (stats.sunlitHours / windowHours) * 100,
      earthPct: (stats.earthVisibleHours / windowHours) * 100,
      bothPct: (stats.bothHours / windowHours) * 100,
      powerRank: null,
      commsRank: null,
    };
  });
  assignRanks(rows, 'sunlitPct', 'powerRank');
  assignRanks(rows, 'earthPct', 'commsRank');
  return rows;
}

/** "123.5 h" — one decimal, always with the unit. */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} h`;
}

/** "73.4%" — one decimal. */
export function formatPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export interface ConditionMetric {
  key: string;
  label: string;
  /** Tailwind bar colour. */
  barClass: string;
  /** Display value, or null when the mission has no coordinates. */
  value: (c: SiteCondition) => string | null;
  /** 0..100 for the bar, or null when not applicable. */
  pct: (c: SiteCondition) => number | null;
}

function hoursValue(
  get: (s: WindowStats) => number,
  windowHours: number,
): (c: SiteCondition) => string | null {
  return (c) =>
    c.stats === null
      ? null
      : `${formatHours(get(c.stats))} · ${formatPct((get(c.stats) / windowHours) * 100)}`;
}

function hoursPct(
  get: (s: WindowStats) => number,
  windowHours: number,
): (c: SiteCondition) => number | null {
  return (c) => (c.stats === null ? null : (get(c.stats) / windowHours) * 100);
}

/**
 * The five condition metrics, in display order. Window length is fixed at
 * call time so the "% of window" figures are consistent across the section.
 */
export function conditionMetrics(windowHours: number): ConditionMetric[] {
  return [
    {
      key: 'sunlit',
      label: 'Sunlight',
      barClass: 'bg-sun',
      value: hoursValue((s) => s.sunlitHours, windowHours),
      pct: hoursPct((s) => s.sunlitHours, windowHours),
    },
    {
      key: 'earth',
      label: 'Earth visible',
      barClass: 'bg-accent',
      value: hoursValue((s) => s.earthVisibleHours, windowHours),
      pct: hoursPct((s) => s.earthVisibleHours, windowHours),
    },
    {
      key: 'both',
      label: 'Sun + Earth up',
      barClass: 'bg-signal-ok',
      value: hoursValue((s) => s.bothHours, windowHours),
      pct: hoursPct((s) => s.bothHours, windowHours),
    },
    {
      key: 'longestSunlit',
      label: 'Longest sunlit stretch',
      barClass: 'bg-sun/60',
      value: hoursValue((s) => s.longestSunlitStretchHours, windowHours),
      pct: hoursPct((s) => s.longestSunlitStretchHours, windowHours),
    },
    {
      key: 'longestDark',
      label: 'Longest dark stretch',
      barClass: 'bg-slate-500',
      value: hoursValue((s) => s.longestDarkStretchHours, windowHours),
      pct: hoursPct((s) => s.longestDarkStretchHours, windowHours),
    },
  ];
}

/**
 * Metric keys whose values differ across the compared sites — the same rule
 * as the record compare (lib/compare.ts): "no coordinates" counts as
 * different from any computed value.
 */
export function differingConditionKeys(
  conditions: SiteCondition[],
  metrics: ConditionMetric[],
): Set<string> {
  const out = new Set<string>();
  for (const metric of metrics) {
    const values = conditions.map((c) => metric.value(c) ?? '—');
    if (new Set(values).size > 1) out.add(metric.key);
  }
  return out;
}
