import { COMPARE_FIELDS, differingKeys } from '../lib/compare';
import type { Mission } from '../lib/types';
import StatusBadge from './StatusBadge';

// Mobile compare (D-006): stacked cards with identical field order.
export default function CompareCards({ missions }: { missions: Mission[] }) {
  const diff = differingKeys(missions);
  return (
    <div className="space-y-4">
      {missions.map((m) => (
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
        </section>
      ))}
    </div>
  );
}
