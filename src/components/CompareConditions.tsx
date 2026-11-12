/**
 * Phase 3 — "Site conditions" section on the Compare page.
 *
 * Desktop: a table with one column per site, a small bar per metric, and
 * the existing differing-value shading. Mobile values live in CompareCards
 * (same data, same window) — this component still renders the heading,
 * controls, disclaimer and method note on all sizes.
 */
import { useMemo } from 'react';
import {
  conditionMetrics,
  differingConditionKeys,
  type SiteCondition,
} from '../lib/compareConditions';
import {
  DAY_LABELS,
  NAVIGATOR_DAYS,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  windowLabel,
  type CompareWindowPatch,
  type CompareWindowState,
  type NavigatorDays,
} from './compare/useCompareWindowState';

/** Horizontal bar: pct of the window (0..100). Colour is never the only signal — the value text sits beside it. */
export function ConditionBar({ pct, barClass }: { pct: number | null; barClass: string }) {
  if (pct === null) return <span className="text-slate-400">—</span>;
  return (
    <div
      className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-space-800"
      role="img"
      aria-label={`${pct.toFixed(1)} percent of the window`}
    >
      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

/** Power/comms rank chips for one site (null rank = no coordinates). */
export function RankChips({ condition }: { condition: SiteCondition }) {
  if (!condition.hasCoords) {
    return <span className="text-xs text-slate-400">No verified coordinates</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      <span className="rounded-full bg-sun/15 px-2 py-0.5 text-xs text-sun">
        ☀ Power #{condition.powerRank}
      </span>
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
        📡 Comms #{condition.commsRank}
      </span>
    </span>
  );
}

interface SiteConditionsProps {
  conditions: SiteCondition[];
  window: CompareWindowState;
  updateWindow: (patch: CompareWindowPatch) => void;
}

export default function SiteConditionsSection({
  conditions,
  window,
  updateWindow,
}: SiteConditionsProps) {
  const metrics = useMemo(() => conditionMetrics(window.windowHours), [window.windowHours]);
  const diff = useMemo(
    () => differingConditionKeys(conditions, metrics),
    [conditions, metrics],
  );
  const bestPower = conditions.find((c) => c.powerRank === 1);
  const bestComms = conditions.find((c) => c.commsRank === 1);

  const onStartChange = (value: string) => {
    const d = fromDatetimeLocalValue(value);
    if (d === null) return;
    updateWindow({ windowStart: d });
  };
  const onNow = () => {
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    updateWindow({ windowStart: now });
  };

  return (
    <section className="mt-8" aria-labelledby="site-conditions-heading">
      <h2 id="site-conditions-heading" className="mb-1 text-xl font-bold">
        Site conditions
      </h2>
      <p className="mb-3 text-sm text-slate-300">
        Sunlight and Earth visibility for each site over the same window — what
        decides power and communication. Best power:{' '}
        <span className="text-slate-100">{bestPower ? bestPower.mission.name : '—'}</span>
        {' · '}Best comms:{' '}
        <span className="text-slate-100">{bestComms ? bestComms.mission.name : '—'}</span>
      </p>

      {/* Window controls */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-space-800 bg-space-900 p-4 text-sm">
        <label className="block">
          <span className="mb-1 block text-slate-400">Window start (UTC)</span>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(window.windowStart)}
            onChange={(e) => onStartChange(e.target.value)}
            className="min-h-[44px] rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 tabular-nums"
          />
        </label>
        <button
          type="button"
          onClick={onNow}
          className="min-h-[44px] rounded-md border border-space-700 px-4 text-slate-200 hover:bg-space-800"
        >
          Now
        </button>
        <label className="block">
          <span className="mb-1 block text-slate-400">Window length</span>
          <select
            value={window.days}
            onChange={(e) => updateWindow({ days: Number(e.target.value) as NavigatorDays })}
            className="min-h-[44px] rounded-md border border-space-700 bg-space-950 px-3 text-slate-100"
          >
            {NAVIGATOR_DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-slate-200">
          <input
            type="checkbox"
            checked={window.sunDisc}
            onChange={(e) => updateWindow({ sunDisc: e.target.checked })}
            className="h-4 w-4"
          />
          Sun-disc mode (upper limb, +0.27°)
        </label>
        <p className="w-full text-xs text-slate-400">
          Window: {windowLabel(window.windowStart, window.days)} · changes update the
          table and the mobile cards below, and live in the URL.
        </p>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Geometric estimate — terrain not included. Coordinates are approximate
        feature centres.
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-space-700 bg-space-950 p-3 text-left font-medium text-slate-400">
                Condition
              </th>
              {conditions.map((c) => (
                <th key={c.mission.id} className="border-b border-space-700 p-3 text-left align-top">
                  <span className="block font-semibold">{c.mission.name}</span>
                  <span className="mt-1 block">
                    <RankChips condition={c} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.key}>
                <th className="sticky left-0 z-10 border-b border-space-800 bg-space-950 p-3 text-left font-normal text-slate-400">
                  {metric.label}
                </th>
                {conditions.map((c) => {
                  const value = metric.value(c);
                  return (
                    <td
                      key={c.mission.id}
                      className={`border-b border-space-800 p-3 align-top ${
                        diff.has(metric.key) ? 'bg-signal-warn/10 text-signal-warn' : 'text-slate-200'
                      }`}
                    >
                      {value === null ? (
                        <span className="text-slate-400">— no verified coordinates</span>
                      ) : (
                        <span className="block space-y-1">
                          <span className="tabular-nums">{value}</span>
                          <ConditionBar pct={metric.pct(c)} barClass={metric.barClass} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-4 rounded-lg border border-space-800 bg-space-900 p-4 text-sm shadow-panel">
        <summary className="flex min-h-[44px] cursor-pointer items-center font-medium text-slate-200">
          Method &amp; assumptions
        </summary>
        <div className="mt-2 space-y-2 text-slate-300">
          <p>
            For a site (φ, λ) and a body whose sub-point is (φ<sub>b</sub>, λ
            <sub>b</sub>):
          </p>
          <p className="rounded bg-space-950 p-2 font-mono text-xs">
            elevation = asin( sinφ·sinφ<sub>b</sub> + cosφ·cosφ<sub>b</sub>·cos(λ −
            λ<sub>b</sub>) )
          </p>
          <p>
            Azimuth is the standard spherical formula, 0° = north, clockwise,
            0–360°. Sun-disc mode judges “Sun up” by the upper limb (+0.27°).
            Hours are sampled every 30 minutes over the chosen window; “Sun +
            Earth up” counts the samples where both bodies are above the
            horizon.
          </p>
          <p>
            Sources: Sun/Moon positions from the{' '}
            <span className="text-slate-100">astronomy-engine</span> package (MIT);
            sub-Earth point from its libration (Meeus ch. 53); sub-solar point by
            Meeus ch. 53&apos;s construction. Site coordinates come from the mission
            dataset (NASA CLPS deliveries, USGS Gazetteer — approximate feature
            centres). Power rank orders sites by sunlit %; comms rank by
            Earth-visible %.
          </p>
          <p>
            Limits: geometric ideal horizon — terrain obstruction is NOT included, so
            a real lander behind a ridge sees less sky than this. Positions are
            good to about ±0.3°. Nothing here is survey-grade.
          </p>
        </div>
      </details>
    </section>
  );
}
