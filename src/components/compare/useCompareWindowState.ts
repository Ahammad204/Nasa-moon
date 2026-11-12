/**
 * Site-conditions window state for the Compare page, in the query string:
 * ?compare=<ids>&cstart=<ISO UTC>&cdays=<7|14|29.5>&cdisc=<0|1>.
 *
 * Separate params from the Navigator page (t/days/disc) so the two pages
 * never clash. Defaults: window starting now, 7 days, centre-based Sun.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DAY_LABELS,
  NAVIGATOR_DAYS,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  type NavigatorDays,
} from '../navigator/useNavigatorState';

export type { NavigatorDays };
export { DAY_LABELS, NAVIGATOR_DAYS, fromDatetimeLocalValue, toDatetimeLocalValue };

export interface CompareWindowState {
  /** Window start, UTC. */
  windowStart: Date;
  days: NavigatorDays;
  sunDisc: boolean;
  /** Window length in hours. */
  windowHours: number;
}

export interface CompareWindowPatch {
  windowStart?: Date;
  days?: NavigatorDays;
  sunDisc?: boolean;
}

function parseDays(raw: string | null): NavigatorDays {
  const n = raw === null ? NaN : Number(raw);
  if (n === 7 || n === 14 || n === 29.5) return n;
  return 7;
}

function parseDate(raw: string | null): Date {
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  return now;
}

/** Short UTC label for the window, e.g. "7 days from 13 Nov 2026, 00:00 UTC". */
export function windowLabel(start: Date, days: NavigatorDays): string {
  const d = DAY_LABELS[days];
  const date = start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = start.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${d} from ${date}, ${time} UTC`;
}

export function useCompareWindowState(): {
  state: CompareWindowState;
  update: (patch: CompareWindowPatch) => void;
} {
  const [params, setParams] = useSearchParams();

  const state = useMemo<CompareWindowState>(() => {
    const days = parseDays(params.get('cdays'));
    const windowStart = parseDate(params.get('cstart'));
    const sunDisc = params.get('cdisc') === '1';
    return { windowStart, days, sunDisc, windowHours: days * 24 };
  }, [params]);

  const update = useCallback(
    (patch: CompareWindowPatch) => {
      const next = new URLSearchParams(params);
      if (patch.windowStart !== undefined) next.set('cstart', patch.windowStart.toISOString());
      if (patch.days !== undefined) next.set('cdays', String(patch.days));
      if (patch.sunDisc !== undefined) next.set('cdisc', patch.sunDisc ? '1' : '0');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return { state, update };
}
