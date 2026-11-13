import { useState } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../components/SourceBadge';
import { getMoonConstantById } from '../lib/moonConstants';
import { getInteriorLayerById, interiorLayers } from '../lib/moonInterior';

// Moon interior cutaway (Science Context, Phase 5a). NASA numbers only.
// The drawing is schematic, not to scale: at the Moon's radius (1,737.4 km)
// a 40 km crust would be a hairline, so the rings are exaggerated and every
// layer is labelled with its real value. Tap a layer (or its button) to read
// what it is made of. Older diagrams show 60/100 km crust and a ~400 km
// core; NASA's current values are used here.

// ViewBox 640 x 640, centre (320, 320). Ring radii are illustrative only.
const R_OUTER = 300; // surface
const R_CRUST = 288; // crust band (exaggerated for legibility)
const R_MANTLE = 210; // mantle outer edge
const R_OUTER_CORE = 130; // liquid outer core outer edge

const LAYER_RING: Record<string, { rOuter: number; rInner: number; fill: string }> = {
  crust: { rOuter: R_OUTER, rInner: R_CRUST, fill: '#78716c' },
  mantle: { rOuter: R_CRUST, rInner: R_MANTLE, fill: '#b45309' },
  'outer-core': { rOuter: R_MANTLE, rInner: R_OUTER_CORE, fill: '#ea580c' },
  'inner-core': { rOuter: R_OUTER_CORE, rInner: 0, fill: '#fbbf24' },
};

function ringPath(rOuter: number, rInner: number): string {
  const c = 320;
  const outer = `M ${c - rOuter} ${c} a ${rOuter} ${rOuter} 0 1 0 ${2 * rOuter} 0 a ${rOuter} ${rOuter} 0 1 0 ${-2 * rOuter} 0`;
  if (rInner <= 0) return outer;
  const inner = `M ${c - rInner} ${c} a ${rInner} ${rInner} 0 1 1 ${2 * rInner} 0 a ${rInner} ${rInner} 0 1 1 ${-2 * rInner} 0`;
  return `${outer} ${inner}`;
}

export default function MoonInteriorPage() {
  const [selectedId, setSelectedId] = useState('crust');
  const selected = getInteriorLayerById(selectedId) ?? interiorLayers[0];
  const radius = getMoonConstantById('moon-radius');

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium uppercase tracking-wider text-accent">Science Context</p>
      <h1 className="mt-1 text-3xl font-bold">Inside the Moon</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-300">
        The Moon has a crust, a mantle and an iron core. The sizes NASA
        measures today differ from the older diagrams many textbooks still
        print.{' '}
        <SourceBadge ids={['nasa-moon-facts', 'nasa-composition']} />
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Moon&apos;s mean radius: {radius?.display ?? '1,737.4 km'}. The drawing below
        is schematic, not to scale. A true-scale 40 km crust would be a hairline.
      </p>

      <div className="mt-6">
        <svg
          viewBox="0 0 640 640"
          role="img"
          aria-label="Schematic cutaway of the Moon's interior: crust, mantle, liquid outer core and solid inner core"
          className="mx-auto w-full max-w-md"
        >
          {interiorLayers.map((layer) => {
            const ring = LAYER_RING[layer.id];
            if (!ring) return null;
            const active = layer.id === selectedId;
            return (
              <g key={layer.id}>
                <path
                  d={ringPath(ring.rOuter, ring.rInner)}
                  fill={ring.fill}
                  fillOpacity={active ? 0.95 : 0.55}
                  stroke={active ? '#fbbf24' : '#0f172a'}
                  strokeWidth={active ? 3 : 1}
                  onClick={() => setSelectedId(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(layer.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${layer.name} — select to read about it`}
                  aria-pressed={active}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                />
              </g>
            );
          })}
          {/* Label sits above the rim: the outer circle tops out at y=20,
              so y=24 put the text across the rim. y=14 clears it. */}
          <text x="320" y="14" textAnchor="middle" fill="#94a3b8" fontSize="14">
            Surface — radius 1,737.4 km
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Interior layers">
        {interiorLayers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => setSelectedId(layer.id)}
            aria-pressed={layer.id === selectedId}
            className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium ${
              layer.id === selectedId
                ? 'border-accent bg-accent-dim/40 text-accent'
                : 'border-space-700 bg-space-900 text-slate-200 hover:bg-space-800'
            }`}
          >
            {layer.name}
          </button>
        ))}
      </div>

      <section
        aria-live="polite"
        className="mt-4 rounded-xl border border-space-700 bg-space-900 p-5"
      >
        <h2 className="text-xl font-semibold">{selected.name}</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-300">{selected.summary}</p>
        <dl className="mt-3 space-y-1 text-sm tabular-nums">
          {selected.thicknessKmNear != null && selected.thicknessKmFar != null && (
            <div className="flex gap-2">
              <dt className="text-slate-400">Thickness:</dt>
              <dd>
                about {selected.thicknessKmNear} km (near side) / about{' '}
                {selected.thicknessKmFar} km (far side)
              </dd>
            </div>
          )}
          {selected.thicknessKm != null && (
            <div className="flex gap-2">
              <dt className="text-slate-400">Thickness:</dt>
              <dd>about {selected.thicknessKm} km</dd>
            </div>
          )}
          {selected.radiusKm != null && (
            <div className="flex gap-2">
              <dt className="text-slate-400">Radius:</dt>
              <dd>about {selected.radiusKm} km</dd>
            </div>
          )}
        </dl>
        <div className="mt-3">
          <SourceBadge ids={selected.sourceIds} />
        </div>
      </section>

      <p className="mt-4 rounded-lg border border-space-700 bg-space-900 p-4 text-sm text-slate-400">
        Note: older diagrams show a 60 km near-side / 100 km far-side crust and a
        core of about 400 km radius. NASA&apos;s current values are used here:
        40 km / 60 km crust, and a solid inner core of about 240 km radius
        plus about 90 km of liquid shell.
      </p>

      <p className="mt-6 text-sm">
        <Link to="/composition" className="text-accent underline">
          The Moon&apos;s makeup →
        </Link>{' '}
        ·{' '}
        <Link to="/library" className="text-accent underline">
          Research Library
        </Link>
      </p>
    </main>
  );
}
