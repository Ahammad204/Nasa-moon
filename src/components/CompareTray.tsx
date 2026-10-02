import { Link } from 'react-router-dom';
import { getMissionById } from '../lib/missions';
import { useCompare } from './CompareContext';

export default function CompareTray() {
  const { ids, message, remove, clear } = useCompare();
  if (ids.length === 0 && !message) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1200] border-t border-space-700 bg-space-900/95 px-4 py-3"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-400">Compare ({ids.length}/3):</span>
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => remove(id)}
            aria-label={`Remove ${getMissionById(id)?.name ?? id} from compare`}
            className="flex min-h-[44px] items-center gap-1 rounded-full border border-accent/60 bg-accent-dim/40 px-3 text-accent"
          >
            {getMissionById(id)?.name ?? id} <span aria-hidden="true">(x)</span>
          </button>
        ))}
        {message && <span className="text-signal-warn">{message}</span>}
        <span className="ml-auto flex items-center gap-3">
          {ids.length > 0 && (
            <button type="button" onClick={clear} className="min-h-[44px] text-slate-400 underline">
              Clear
            </button>
          )}
          <Link
            to={`/compare?compare=${ids.join(',')}`}
            className="flex min-h-[44px] items-center rounded-md bg-accent-dim px-4 text-white transition-colors duration-200 hover:bg-accent-dim/80 hover:shadow-glow"
          >
            Compare -&gt;
          </Link>
        </span>
      </div>
    </div>
  );
}
