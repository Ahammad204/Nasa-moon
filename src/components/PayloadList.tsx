import { payloadCount, payloadCountDiffers } from '../lib/missions';
import type { Mission } from '../lib/types';
import CountUp from './CountUp';

export default function PayloadList({ mission }: { mission: Mission }) {
  const total = payloadCount(mission);

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">
        Payloads ({total === null ? '-' : <CountUp value={total} />})
      </h2>
      {payloadCountDiffers(mission) && (
        <p className="mb-2 text-sm text-signal-warn">
          Sources report {mission.payloadCountReported} payloads; {mission.payloads.length}{' '}
          detailed here (see notes).
        </p>
      )}
      {mission.payloads.length === 0 ? (
        <p className="text-slate-400">No payload data for this mission.</p>
      ) : (
        <ul className="space-y-3">
          {mission.payloads.map((p) => (
            <li key={p.name} className="rounded-lg border border-space-800 bg-space-900 p-3">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-slate-400">{p.organization ?? '-'}</p>
              {p.purpose && <p className="mt-1 text-sm text-slate-300">{p.purpose}</p>}
              {p.type && <p className="mt-1 text-xs text-slate-400">Type: {p.type}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
