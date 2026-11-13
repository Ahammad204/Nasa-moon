import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMissionById, hasMapPosition, missions } from '../../lib/missions';
import { computableSites } from '../../lib/sites';

/**
 * Sun & Earth Navigator — state lives in the query string so every view is
 * shareable: ?site=<mission id>&t=<ISO UTC window start>&off=<hours into
 * the window>&days=<7|14|29.5>&disc=<0|1>.
 *
 * A custom point can be opened directly with ?lat=<deg>&lon=<deg>
 * (both required, lat -90..90, lon -180..180). A valid lat+lon pair takes
 * precedence over ?site= when both are given. An invalid or incomplete
 * pair is ignored entirely and the navigator falls back to ?site= (or the
 * default site) — it never crashes or shows an error page.
 *
 * `t` is the window START (UTC); the slider/playhead moves `off` hours into
 * the window, so `current = t + off`. The date-time picker edits `t` (and
 * resets `off` to 0); "Now" sets `t` to the current hour.
 */

export type NavigatorDays = 7 | 14 | 29.5;
export const NAVIGATOR_DAYS: NavigatorDays[] = [7, 14, 29.5];
export const DAY_LABELS: Record<NavigatorDays, string> = {
  7: '7 days',
  14: '14 days',
  29.5: '1 lunar day (29.5 d)',
};

/** Default site: IM-2, Mons Mouton — a south-pole Artemis III candidate. */
export const DEFAULT_SITE_ID = 'prime-1';

/** Id used for a site defined by ?lat=&lon= (no mission or region data). */
export const CUSTOM_SITE_ID = 'custom';

/**
 * Display label for a custom site. Honest and plain on purpose: an
 * arbitrary point has no mission, provider, or region name, so the label
 * is just the coordinates — never an invented name.
 */
export function customSiteLabel(latitude: number, longitude: number): string {
  return `Custom site (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;
}

/**
 * Parse a ?lat=&lon= pair from the query string. Returns the custom site
 * only when BOTH values are present, parse as finite numbers, and are in
 * range (lat -90..90, lon -180..180). Anything else returns null, so the
 * caller falls back to the existing ?site= behaviour.
 */
export function parseCustomSite(params: URLSearchParams): NavigatorSiteOption | null {
  const rawLat = params.get('lat');
  const rawLon = params.get('lon');
  // Blank counts as missing: Number('') is 0, which would silently
  // invent a (0, 0) site the URL never asked for.
  if (rawLat === null || rawLon === null) return null;
  if (rawLat.trim() === '' || rawLon.trim() === '') return null;
  const latitude = Number(rawLat);
  const longitude = Number(rawLon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const label = customSiteLabel(latitude, longitude);
  return { id: CUSTOM_SITE_ID, name: label, siteName: label, latitude, longitude };
}

/**
 * Resolve which site the navigator shows for a query string.
 * Precedence: a valid ?lat=&lon= pair wins over ?site=; otherwise the
 * named site, else the default site. Never throws for bad input.
 */
export function resolveNavigatorSite(params: URLSearchParams): NavigatorSiteOption {
  const custom = parseCustomSite(params);
  if (custom) return custom;
  const options = navigatorSiteOptions();
  const rawSite = params.get('site');
  return (
    options.find((o) => o.id === rawSite) ??
    options.find((o) => o.id === DEFAULT_SITE_ID) ??
    options[0]
  );
}

export interface NavigatorSiteOption {
  id: string;
  name: string;
  siteName: string;
  latitude: number;
  longitude: number;
}

export function navigatorSiteOptions(): NavigatorSiteOption[] {
  // Missions first (existing order preserved — shareable URLs keep working),
  // then the south-pole Artemis III candidate regions and Shackleton.
  // Sites without verified coordinates are excluded here; they are still
  // listed on the South Pole page with a "no verified coordinates" note.
  const missionOptions = missions.filter(hasMapPosition).map((m) => ({
    id: m.id,
    name: m.name,
    siteName: m.landingSite?.name ?? 'Landing site',
    latitude: m.landingSite!.latitude!,
    longitude: m.landingSite!.longitude!,
  }));
  const poleOptions = computableSites().map((s) => ({
    id: s.id,
    name: s.name,
    siteName:
      s.kind === 'artemis-candidate' ? 'Artemis III candidate region' : 'South-pole crater',
    latitude: s.latitude!,
    longitude: s.longitude!,
  }));
  return [...missionOptions, ...poleOptions];
}

export interface NavigatorState {
  siteId: string;
  site: NavigatorSiteOption;
  /** Window start, UTC. */
  windowStart: Date;
  /** Hours from windowStart to the playhead. */
  offsetHours: number;
  days: NavigatorDays;
  sunDisc: boolean;
  /** windowStart + offsetHours. */
  current: Date;
  /** Window length in hours. */
  windowHours: number;
}

export interface NavigatorPatch {
  siteId?: string;
  windowStart?: Date;
  offsetHours?: number;
  days?: NavigatorDays;
  sunDisc?: boolean;
}

function parseDays(raw: string | null): NavigatorDays {
  const n = raw === null ? NaN : Number(raw);
  if (n === 7 || n === 14 || n === 29.5) return n;
  return 29.5;
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

/** Format a Date as the UTC value for <input type="datetime-local">. */
export function toDatetimeLocalValue(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}T${p(date.getUTCHours())}:${p(date.getUTCMinutes())}`;
}

/** Parse a datetime-local value as UTC (the input itself has no zone). */
export function fromDatetimeLocalValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function useNavigatorState(): {
  state: NavigatorState;
  update: (patch: NavigatorPatch) => void;
} {
  const [params, setParams] = useSearchParams();

  const state = useMemo<NavigatorState>(() => {
    const site = resolveNavigatorSite(params);
    const days = parseDays(params.get('days'));
    const windowHours = days * 24;
    const windowStart = parseDate(params.get('t'));
    const rawOff = Number(params.get('off') ?? '0');
    const offsetHours = Number.isFinite(rawOff)
      ? Math.max(0, Math.min(windowHours, rawOff))
      : 0;
    const sunDisc = params.get('disc') === '1';
    return {
      siteId: site.id,
      site,
      windowStart,
      offsetHours,
      days,
      sunDisc,
      current: new Date(windowStart.getTime() + offsetHours * 3_600_000),
      windowHours,
    };
  }, [params]);

  const update = useCallback(
    (patch: NavigatorPatch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patch.siteId !== undefined) {
            next.set('site', patch.siteId);
            // A named site replaces a custom point: drop ?lat=&lon=, or
            // the pair would keep overriding the chosen site. lat/lon
            // are otherwise preserved (all other patches keep them, so
            // the copied shareable link still carries the custom point).
            if (patch.siteId !== CUSTOM_SITE_ID) {
              next.delete('lat');
              next.delete('lon');
            }
          }
          if (patch.windowStart !== undefined) {
            next.set('t', patch.windowStart.toISOString());
            // A new window starts at its beginning.
            if (patch.offsetHours === undefined) next.set('off', '0');
          }
          if (patch.offsetHours !== undefined) {
            next.set('off', String(Math.round(patch.offsetHours * 10) / 10));
          }
          if (patch.days !== undefined) next.set('days', String(patch.days));
          if (patch.sunDisc !== undefined) next.set('disc', patch.sunDisc ? '1' : '0');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { state, update };
}

/** Resolve a mission id to a navigator site, or null when it has no coords. */
export function siteOptionForMission(missionId: string): NavigatorSiteOption | null {
  const m = getMissionById(missionId);
  if (!m || !hasMapPosition(m)) return null;
  return {
    id: m.id,
    name: m.name,
    siteName: m.landingSite?.name ?? 'Landing site',
    latitude: m.landingSite!.latitude!,
    longitude: m.landingSite!.longitude!,
  };
}
