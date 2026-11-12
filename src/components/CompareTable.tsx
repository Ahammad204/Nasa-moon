import { COMPARE_FIELDS, differingKeys } from '../lib/compare';
import type { Mission } from '../lib/types';
import StatusBadge from './StatusBadge';

// One accent per mission column (blue, sky, amber) — shared by the desktop
// table header cards (ComparePage) and the mobile cards (CompareCards).
export const MISSION_ACCENTS = ['#38bdf8', '#7dd3fc', '#fbbf24'];

/**
 * One value cell. A differing value gets a small amber dot, amber text and
 * a short left accent bar on the content itself — never a wash across the
 * whole cell, so empty space stays empty.
 */
function CellValue({
  mission,
  fieldKey,
  differing,
}: {
  mission: Mission;
  fieldKey: string;
  differing: boolean;
}) {
  const field = COMPARE_FIELDS.find((f) => f.key === fieldKey)!;
  const inner =
    fieldKey === 'status' ? (
      <StatusBadge status={mission.status} />
    ) : (
      <>{field.value(mission)}</>
    );
  if (!differing) return <span className="text-slate-200">{inner}</span>;
  return (
    <span className="inline-flex items-start gap-1.5 border-l-2 border-signal-warn pl-2 text-signal-warn">
      <span
        aria-hidden="true"
        className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-signal-warn"
      />
      <span>{inner}</span>
    </span>
  );
}

export default function CompareTable({ missions }: { missions: Mission[] }) {
  const diff = differingKeys(missions);
  return (
    <div className="overflow-x-auto rounded-xl border border-space-800 bg-space-900/60">
      <table className="w-full min-w-[540px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-space-700">
            <th className="w-36 p-3 text-left font-medium text-slate-400 sm:w-44">
              Field
            </th>
            {missions.map((m) => (
              <th
                key={m.id}
                scope="col"
                className="p-3 text-left align-top font-semibold text-slate-100"
              >
                {m.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_FIELDS.map((f) => (
            <tr key={f.key} className="border-b border-space-800 last:border-b-0">
              <th
                scope="row"
                className="p-3 text-left align-top font-normal text-slate-400"
              >
                {f.label}
              </th>
              {missions.map((m) => (
                <td key={m.id} className="p-3 align-top">
                  <CellValue mission={m} fieldKey={f.key} differing={diff.has(f.key)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
