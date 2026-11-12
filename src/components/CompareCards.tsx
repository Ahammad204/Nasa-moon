import { COMPARE_FIELDS, differingKeys } from '../lib/compare';
import {
  conditionMetrics,
  differingConditionKeys,
  type SiteCondition,
} from '../lib/compareConditions';
import type { Mission } from '../lib/types';
import { ConditionBar, RankChips } from './CompareConditions';
import { MISSION_ACCENTS } from './CompareTable';
import StatusBadge from './StatusBadge';

interface CompareCardsProps {
  missions: Mission[];
  /** Phase 3 site conditions, computed by the page for the shared window. */
  conditions?: SiteCondition[] | null;
  /** Window length in hours, for the "% of window" bars. */
  windowHours?: number;
  /** Human-readable window label, e.g. "7 days from 13 Nov 2026, 00:00 UTC". */
  windowLabelText?: string;
  /** Remove one mission from the compare set. */
  onRemove?: (id: string) => void;
}

/** Small amber dot marking a differing value (colour is never the only signal). */
function DiffDot() {
  return (
    <span
      aria-hidden="true"
      className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-signal-warn"
    />
  );
}

// Mobile compare (D-006): stacked cards with identical field order.
// Differing values get a dot, amber text and a short left accent on the
// content itself — never a wash across the whole row.
export default function CompareCards({
  missions,
  conditions = null,
  windowHours = 0,
  windowLabelText = '',
  onRemove,
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
      {missions.map((m, i) => {
        const condition = conditionById.get(m.id);
        const accent = MISSION_ACCENTS[i % MISSION_ACCENTS.length];
        return (
          <section
            key={m.id}
            className="relative overflow-hidden rounded-xl border border-space-800 bg-space-900 p-4"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: accent }}
            />
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-100">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                {m.name}
              </h3>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  aria-label={`Remove ${m.name} from compare`}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-lg text-slate-400 hover:bg-space-800 hover:text-slate-100"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {m.provider ?? 'Provider TBA'}
              {m.lander ? ` · ${m.lander}` : ''}
            </p>
            <p className="mt-2">
              <StatusBadge status={m.status} />
            </p>

            <dl className="mt-3 space-y-1.5 border-t border-space-800 pt-3 text-sm">
              {COMPARE_FIELDS.filter((f) => f.key !== 'status').map((f) => {
                const isDiff = diff.has(f.key);
                return (
                  <div key={f.key} className="flex gap-2">
                    <dt className="w-28 shrink-0 text-slate-400">{f.label}</dt>
                    <dd
                      className={
                        isDiff
                          ? 'flex items-start gap-1.5 border-l-2 border-signal-warn pl-2 text-signal-warn'
                          : 'text-slate-200'
                      }
                    >
                      {isDiff && <DiffDot />}
                      <span>{f.value(m)}</span>
                    </dd>
                  </div>
                );
              })}
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
                      const isDiff = conditionDiff.has(metric.key);
                      return (
                        <div key={metric.key} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-slate-400">{metric.label}</dt>
                            <dd
                              className={`flex items-start gap-1.5 tabular-nums ${
                                isDiff
                                  ? 'border-l-2 border-signal-warn pl-2 text-signal-warn'
                                  : 'text-slate-200'
                              }`}
                            >
                              {isDiff && <DiffDot />}
                              <span>{value ?? '—'}</span>
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
