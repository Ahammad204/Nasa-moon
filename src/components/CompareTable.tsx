import { COMPARE_FIELDS, differingKeys } from '../lib/compare';
import type { Mission } from '../lib/types';
import StatusBadge from './StatusBadge';

function CellValue({ mission, fieldKey }: { mission: Mission; fieldKey: string }) {
  const field = COMPARE_FIELDS.find((f) => f.key === fieldKey)!;
  if (fieldKey === 'status') return <StatusBadge status={mission.status} />;
  return <>{field.value(mission)}</>;
}

export default function CompareTable({ missions }: { missions: Mission[] }) {
  const diff = differingKeys(missions);
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="sticky left-0 z-10 border-b border-space-700 bg-space-950 p-3 text-left font-medium text-slate-400">
            Field
          </th>
          {missions.map((m) => (
            <th key={m.id} className="border-b border-space-700 p-3 text-left align-top">
              <span className="font-semibold">{m.name}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {COMPARE_FIELDS.map((f) => (
          <tr key={f.key}>
            <th className="sticky left-0 z-10 border-b border-space-800 bg-space-950 p-3 text-left font-normal text-slate-400">
              {f.label}
            </th>
            {missions.map((m) => (
              <td
                key={m.id}
                className={`border-b border-space-800 p-3 align-top ${
                  diff.has(f.key) ? 'bg-signal-warn/10 text-signal-warn' : 'text-slate-200'
                }`}
              >
                <CellValue mission={m} fieldKey={f.key} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
