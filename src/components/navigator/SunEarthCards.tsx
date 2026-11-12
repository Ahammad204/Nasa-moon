import type { SunEarthState, WindowStats } from '../../lib/astro';
import { fmtAzimuth, fmtDeg, fmtDuration, fmtHours, fmtPct, fmtUtc } from './format';
import type { EventKind } from './eventFromSamples';

export interface NextEventInfo {
  at: Date | null;
  kind: EventKind | null;
}

function Badge({ up, upLabel, downLabel, color }: {
  up: boolean;
  upLabel: string;
  downLabel: string;
  color: 'sun' | 'earth' | 'both';
}) {
  const styles =
    color === 'sun'
      ? 'border-sun/50 bg-sun/10 text-sun'
      : color === 'earth'
        ? 'border-accent/50 bg-accent/10 text-accent'
        : 'border-signal-ok/50 bg-signal-ok/10 text-signal-ok';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      <span aria-hidden="true">{up ? '●' : '○'}</span>
      {up ? upLabel : downLabel}
    </span>
  );
}

function eventLine(
  next: NextEventInfo,
  current: Date,
  bodyName: string,
  setLabel: string,
  riseLabel: string,
  neverLabel: string,
  staysUpLabel: string,
  staysDownLabel: string,
  isUp: boolean,
): string {
  if (next.at === null) {
    return isUp ? staysUpLabel : bodyName === 'Earth' ? neverLabel : staysDownLabel;
  }
  const label = next.kind === 'set' ? setLabel : riseLabel;
  return `${label} in ${fmtDuration(next.at.getTime() - current.getTime())} · ${fmtUtc(next.at)}`;
}

/**
 * Live readouts for one site at one instant: Sun/Earth elevation + azimuth,
 * status badges, next rise/set, and (when window stats are passed) the
 * window totals. Colour is never the only signal — every badge also has a
 * text label and a filled/empty glyph.
 */
export default function SunEarthCards({
  state,
  nextSun,
  nextEarth,
  current,
  stats,
  eventsPending = false,
}: {
  state: SunEarthState;
  nextSun: NextEventInfo;
  nextEarth: NextEventInfo;
  current: Date;
  stats?: WindowStats;
  /**
   * True while the next rise/set is still being computed (the compact panel
   * defers the scan off first paint). Shows "Calculating…" instead of
   * guessing a "stays up" line from a not-yet-known null.
   */
  eventsPending?: boolean;
}) {
  const bothUp = state.sun.up && state.earth.up;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-300">☀ Sun</h3>
            <Badge up={state.sun.up} upLabel="Sunlit" downLabel="In shadow" color="sun" />
          </div>
          <p className="tabular-nums text-2xl font-semibold text-sun">
            {fmtDeg(state.sun.elevation)}
          </p>
          <p className="text-xs text-slate-400">elevation</p>
          <p className="mt-2 tabular-nums text-lg text-slate-100">{fmtAzimuth(state.sun.azimuth)}</p>
          <p className="text-xs text-slate-400">azimuth (0° = north)</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300" aria-live="polite">
            {eventsPending
              ? 'Calculating next events…'
              : eventLine(
                  nextSun,
                  current,
                  'Sun',
              'Sunset',
              'Sunrise',
              '',
              'Sun stays up through the window',
              'Sun stays down through the window',
              state.sun.up,
            )}
          </p>
        </div>

        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-300">⊕ Earth</h3>
            <Badge up={state.earth.up} upLabel="Earth in view" downLabel="No line of sight" color="earth" />
          </div>
          <p className="tabular-nums text-2xl font-semibold text-accent">
            {fmtDeg(state.earth.elevation)}
          </p>
          <p className="text-xs text-slate-400">elevation</p>
          <p className="mt-2 tabular-nums text-lg text-slate-100">{fmtAzimuth(state.earth.azimuth)}</p>
          <p className="text-xs text-slate-400">azimuth (0° = north)</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300" aria-live="polite">
            {eventsPending
              ? 'Calculating next events…'
              : eventLine(
                  nextEarth,
                  current,
                  'Earth',
              'Earthset',
              'Earthrise',
              'Earth never visible from this site',
              'Earth stays in view through the window',
              'Earth stays below the horizon through the window',
              state.earth.up,
            )}
          </p>
        </div>
      </div>

      {bothUp && (
        <p className="rounded-lg border border-signal-ok/50 bg-signal-ok/10 px-3 py-2 text-sm font-medium text-signal-ok">
          ✓ Powered + communicating: Sun and Earth are both up.
        </p>
      )}

      <p className="text-xs text-slate-400">
        At <span className="tabular-nums text-slate-300">{fmtUtc(current)}</span>
        {state.sun.up && state.earth.up
          ? ''
          : '. The lander is in shadow or out of contact right now.'}
      </p>

      {stats && (
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <h3 className="mb-2 text-sm font-medium text-slate-300">
            Window totals · {fmtHours(stats.windowHours)} window
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-400">Sunlight</dt>
            <dd className="tabular-nums text-right text-slate-100">
              {fmtHours(stats.sunlitHours)} · {fmtPct(stats.sunlitHours, stats.windowHours)}
            </dd>
            <dt className="text-slate-400">Earth visible</dt>
            <dd className="tabular-nums text-right text-slate-100">
              {fmtHours(stats.earthVisibleHours)} · {fmtPct(stats.earthVisibleHours, stats.windowHours)}
            </dd>
            <dt className="text-slate-400">Sun + Earth together</dt>
            <dd className="tabular-nums text-right font-medium text-signal-ok">
              {fmtHours(stats.bothHours)} · {fmtPct(stats.bothHours, stats.windowHours)}
            </dd>
            <dt className="text-slate-400">Longest sunlit stretch</dt>
            <dd className="tabular-nums text-right text-slate-100">
              {fmtHours(stats.longestSunlitStretchHours)}
            </dd>
            <dt className="text-slate-400">Longest dark stretch</dt>
            <dd className="tabular-nums text-right text-slate-100">
              {fmtHours(stats.longestDarkStretchHours)}
            </dd>
          </dl>
          <p className="mt-2 text-xs text-slate-400">
            Geometric estimate — terrain not included. Coordinates are approximate feature
            centres.
          </p>
        </div>
      )}
    </div>
  );
}
