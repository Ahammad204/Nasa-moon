import type { MissionStatus } from '../lib/types';

// Semantic set: one accent + positive / warning / danger + neutral.
const STYLES: Record<MissionStatus, string> = {
  upcoming: 'bg-accent-dim/50 text-accent border-accent/40',
  in_flight: 'bg-accent text-space-950 border-accent',
  completed: 'bg-signal-ok/15 text-signal-ok border-signal-ok/40',
  partial: 'bg-signal-warn/15 text-signal-warn border-signal-warn/40',
  failed: 'bg-signal-danger/15 text-signal-danger border-signal-danger/40',
  cancelled: 'bg-space-800 text-slate-400 border-space-700',
};

export default function StatusBadge({ status }: { status: MissionStatus }) {
  // Unknown status values render neutral (ENGINEERING.md: handle unknown status).
  const style = STYLES[status] ?? 'bg-space-800 text-slate-300 border-space-700';
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
