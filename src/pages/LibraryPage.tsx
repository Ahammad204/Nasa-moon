import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../components/SourceBadge';
import { conclusions } from '../lib/conclusions';
import { researchSources, type SourceType } from '../lib/sources';

const TYPE_FILTERS: Array<'All' | SourceType> = ['All', 'NASA page', 'video', 'university', 'lab'];

// Research Library — every conclusion this app states, with its source.
// Search filters the conclusion text and source titles; the type chips
// filter by the type of the conclusion's first source.
export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conclusions.filter((c) => {
      const first = researchSources.find((s) => s.id === c.sourceIds[0]);
      if (type !== 'All' && first?.type !== type) return false;
      if (!q) return true;
      const hay = [
        c.text,
        ...c.sourceIds.map((id) => {
          const s = researchSources.find((x) => x.id === id);
          return s ? `${s.title} ${s.publisher}` : '';
        }),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, type]);

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          📚 Research Library
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Every claim, with its source
        </h1>
        <p className="mt-2 text-base text-slate-300">
          Nothing here is taken on trust. Each conclusion below is one sentence
          in our own words, linked to the NASA, USGS or university source it
          comes from, and to the page in this app where the fact is used.
        </p>
      </header>

      <div className="mb-5 space-y-3">
        <label className="block">
          <span className="sr-only">Search conclusions and sources</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, e.g. water ice, sunlight, radiation…"
            className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 placeholder:text-slate-500"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by source type">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm ${
                type === t
                  ? 'border-accent/60 bg-accent-dim/40 text-white'
                  : 'border-space-700 text-slate-300 hover:bg-space-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-400" aria-live="polite">
          {filtered.length} of {conclusions.length} conclusions
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-space-800 bg-space-900 p-4 text-slate-300">
          No conclusions match that search. Try a different word, or clear the
          filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const first = researchSources.find((s) => s.id === c.sourceIds[0]);
            return (
              <li
                key={c.id}
                className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
              >
                <p className="text-base text-slate-100">{c.text}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <SourceBadge ids={c.sourceIds} />
                  {first && (
                    <span className="rounded-full bg-space-950 px-2 py-0.5 text-xs text-slate-400">
                      {first.type} · {first.publisher}
                    </span>
                  )}
                  <Link
                    to={c.usedIn.path}
                    className="inline-flex min-h-[44px] items-center text-accent underline"
                  >
                    Used in: {c.usedIn.label} →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-8" aria-labelledby="all-sources">
        <h2 id="all-sources" className="text-xl font-bold">
          All sources ({researchSources.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {researchSources.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-space-800 bg-space-900 px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium text-slate-100">{s.title}</span>{' '}
                <span className="text-slate-400">
                  · {s.publisher} · {s.type}
                </span>
              </span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.title}, ${s.publisher} (opens in a new tab)`}
                className="inline-flex min-h-[44px] items-center text-accent underline"
              >
                Open ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Sources accessed 2026-11-12. Educational geometric model. Independent
          project, not affiliated with or endorsed by NASA.
        </p>
      </section>
    </section>
  );
}
