import { useState } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../components/SourceBadge';
import { composition } from '../lib/composition';
import { getSourceById } from '../lib/sources';

// Composition Explorer (Science Context, Phase 5c). Highlands vs maria,
// the surface layers, and Apollo sample cards. Sample photos are NOT
// re-hosted: cards link out to the Washington University Apollo samples
// page, with credit.

export default function CompositionPage() {
  const [terrainId, setTerrainId] = useState('highlands');
  const terrain =
    composition.terrains.find((t) => t.id === terrainId) ?? composition.terrains[0];
  const wustl = getSourceById('wustl-korotev');

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium uppercase tracking-wider text-accent">Science Context</p>
      <h1 className="mt-1 text-3xl font-bold">What is the Moon made of?</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-300">
        Look at the Moon and you see two kinds of ground: bright highlands and
        dark plains. They are different rocks, from different times — and both
        are still there for a lander to stand on.{' '}
        <SourceBadge ids={['nasa-composition', 'open-univ-virtual-microscope']} />
      </p>

      <div className="mt-6 flex gap-2" role="group" aria-label="Terrain type">
        {composition.terrains.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTerrainId(t.id)}
            aria-pressed={t.id === terrainId}
            className={`min-h-[44px] flex-1 rounded-lg border px-4 py-3 text-base font-semibold ${
              t.id === terrainId
                ? 'border-accent bg-accent-dim/40 text-accent'
                : 'border-space-700 bg-space-900 text-slate-200 hover:bg-space-800'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <section
        aria-live="polite"
        className="mt-4 rounded-xl border border-space-700 bg-space-900 p-5"
      >
        <h2 className="text-xl font-semibold">{terrain.name}</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-300">{terrain.summary}</p>
        <dl className="mt-4 space-y-2 text-sm tabular-nums">
          <div className="flex justify-between gap-3 border-b border-space-800 pb-2">
            <dt className="text-slate-400">Rock</dt>
            <dd className="font-medium">{terrain.rock}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-space-800 pb-2">
            <dt className="text-slate-400">Chemistry</dt>
            <dd className="font-medium">{terrain.chemistry}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Age</dt>
            <dd className="font-medium">about {terrain.ageGa} billion years</dd>
          </div>
        </dl>
        <div className="mt-3">
          <SourceBadge ids={terrain.sourceIds} />
        </div>
      </section>

      <h2 className="mt-8 text-xl font-semibold">The ground under your feet</h2>
      <div className="mt-3 space-y-3">
        {composition.surface.map((layer) => (
          <article
            key={layer.id}
            className="rounded-xl border border-space-700 bg-space-900 p-5"
          >
            <h3 className="font-semibold">{layer.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{layer.summary}</p>
            <div className="mt-2">
              <SourceBadge ids={layer.sourceIds} />
            </div>
          </article>
        ))}
      </div>

      <h2 className="mt-8 text-xl font-semibold">Apollo samples</h2>
      <p className="mt-2 text-sm text-slate-400">
        Real pieces of the Moon, brought home by Apollo astronauts. Photos:
        Randy Korotev, Washington University in St. Louis.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {composition.samples.map((sample) => (
          <article
            key={sample.id}
            className="rounded-xl border border-space-700 bg-space-900 p-5"
          >
            <h3 className="font-semibold tabular-nums">Sample {sample.id}</h3>
            <p className="text-sm text-slate-300">{sample.rockType}</p>
            <p className="mt-1 text-sm text-slate-400">{sample.note}</p>
            {wustl && (
              <a
                href={wustl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-accent underline"
              >
                See Apollo sample photos ↗
              </a>
            )}
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Sample photos are not hosted here — the cards link out to the Washington
        University in St. Louis Apollo samples page.
      </p>

      <p className="mt-6 text-sm">
        <Link to="/atlas" className="text-accent underline">
          Explore the Lunar Atlas →
        </Link>{' '}
        ·{' '}
        <Link to="/library" className="text-accent underline">
          Research Library
        </Link>
      </p>
    </main>
  );
}
