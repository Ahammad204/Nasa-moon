import { COMPARE_FIELDS, differingKeys } from '../lib/compare';
import {
  conditionMetrics,
  differingConditionKeys,
  type SiteCondition,
} from '../lib/compareConditions';
import type { Mission } from '../lib/types';
import { ConditionBar, RankChips } from './CompareConditions';
import StatusBadge from './StatusBadge';

interface CompareCardsProps {
  missions: Mission[];
  /** Phase 3 site conditions, computed by the page for the shared window. */
  conditions?: SiteCondition[] | null;
  /** Window length in hours, for the "% of window" bars. */
  windowHours?: number;
  /** Human-readable window label, e.g. "7 days from 13 Nov 2026, 00:00 UTC". */
  windowLabelText?: string;
}

// Mobile compare (D-006): stacked cards with identical field order.
export default function CompareCards({
  missions,
  conditions = null,
  windowHours = 0,
  windowLabelText = '',
}: CompareCardsProps) {
  const diff = differingKeys(missions);
  const metrics = conditionMetrics(windowHours);
  const conditionById = new Map((conditions ?? []).map((c) => [c.mission.id, c]));
  const conditionDiff =
    conditions !== null && windowHours > 0
      ? differingConditionKeys(conditions, metrics)
      : new Set<string>();

  return (
    <div className="space-y-4">
      {missions.map((m) => {
        const condition = conditionById.get(m.id);
        return (
          <section key={m.id} className="rounded-lg border border-space-800 bg-space-900 p-4">
            <h3 className="mb-2 font-semibold">{m.name}</h3>
            <dl className="space-y-1 text-sm">
              {COMPARE_FIELDS.map((f) => (
                <div key={f.key} className={`flex gap-2 ${diff.has(f.key) ? 'text-signal-warn' : ''}`}>
                  <dt className="w-28 shrink-0 text-slate-400">{f.label}</dt>
                  <dd className={diff.has(f.key) ? 'rounded bg-signal-warn/10 px-1 text-signal-warn' : 'text-slate-200'}>
                    {f.key === 'status' ? <StatusBadge status={m.status} /> : f.value(m)}
                  </dd>
                </div>
              ))}
            </dl>

            {condition && (
              <div className="mt-4 border-t border-space-800 pt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-medium text-slate-200">Site conditions</h4>
                  <RankChips condition={condition} />
                </div>
                {windowLabelText && (
                  <p className="mb-2 text-xs text-slate-400">{windowLabelText}</p>
                )}
                {!condition.hasCoords ? (
                  <p className="text-sm text-slate-400">
                    — no verified coordinates, conditions not computed.
                  </p>
                ) : (
                  <dl className="space-y-2 text-sm">
                    {metrics.map((metric) => {
                      const value = metric.value(condition);
                      return (
                        <div key={metric.key} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-slate-400">{metric.label}</dt>
                            <dd
                              className={`tabular-nums ${
                                conditionDiff.has(metric.key)
                                  ? 'rounded bg-signal-warn/10 px-1 text-signal-warn'
                                  : 'text-slate-200'
                              }`}
                            >
                              {value ?? '—'}
                            </dd>
                          </div>
                          <ConditionBar pct={metric.pct(condition)} barClass={metric.barClass} />
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
