import { useState } from 'react';
import { Link } from 'react-router-dom';
import { weightOn } from '../../lib/physics/physics';

// Compact Moon Lab teaser for the landing page — one input, one answer,
// and a link to the full lab. Numbers come from the physics engine.
export default function MoonLabTeaser() {
  const [massKg, setMassKg] = useState(70);
  const moonN = weightOn('moon', massKg);
  const earthN = weightOn('earth', massKg);

  return (
    <section
      aria-labelledby="moon-lab-teaser-heading"
      className="mt-8 rounded-xl border border-space-800 bg-space-900 p-5 shadow-panel sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
        🧪 Moon Lab — try it
      </p>
      <h2 id="moon-lab-teaser-heading" className="mt-1 text-2xl font-bold">
        Your weight on the Moon
      </h2>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Your mass</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={150}
              value={massKg}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setMassKg(Math.min(150, Math.max(1, v)));
              }}
              aria-label="Your mass in kilograms"
              className="min-h-[44px] w-28 rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 tabular-nums"
            />
            <span className="text-slate-400">kg</span>
          </span>
        </label>
        <p className="text-base text-slate-200">
          On the Moon: <span className="font-bold tabular-nums text-amber-300">{moonN.toFixed(1)} N</span>
          {' · '}On Earth: <span className="font-bold tabular-nums text-sky-300">{earthN.toFixed(1)} N</span>
        </p>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        About one sixth of Earth weight. A radio signal still takes about
        1.28 s to reach home.
      </p>
      <Link
        to="/moon-lab"
        className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-5 text-sm font-medium text-white hover:bg-accent/70"
      >
        Open the Moon Lab →
      </Link>
    </section>
  );
}
