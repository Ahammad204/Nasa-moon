import type { Mission } from '../lib/types';

export default function SourceList({ mission }: { mission: Mission }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Sources</h2>
      <ul className="space-y-1 text-sm">
        {mission.sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-accent underline"
            >
              {s.label}
            </a>{' '}
            <span className="text-slate-400">(accessed {s.accessed})</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">Last verified {mission.lastVerified}</p>
    </section>
  );
}
