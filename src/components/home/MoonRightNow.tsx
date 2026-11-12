import { useMemo } from 'react';
import { Body, Illumination, MoonPhase, SearchMoonPhase } from 'astronomy-engine';
import { fmtDateUtc, moonLitPath, phaseName } from '../../lib/moonPhase';

// "The Moon Right Now" — live lunar phase, computed in the browser with
// astronomy-engine (MoonPhase / Illumination / SearchMoonPhase). The moon
// disc is a computed SVG (terminator from the real phase angle), not a
// stock image, so it is always in sync with the numbers.

const R = 64;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-space-950 px-3 py-2.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function MoonRightNow() {
  const data = useMemo(() => {
    const now = new Date();
    const phase = MoonPhase(now);
    const illum = Illumination(Body.Moon, now).phase_fraction;
    const nextFull = SearchMoonPhase(180, now, 40);
    const nextNew = SearchMoonPhase(0, now, 40);
    return {
      now,
      phase,
      name: phaseName(phase),
      illumPct: illum * 100,
      nextFull: nextFull ? nextFull.date : null,
      nextNew: nextNew ? nextNew.date : null,
    };
  }, []);

  return (
    <section
      aria-labelledby="moon-now-heading"
      className="mt-8 overflow-hidden rounded-xl border border-space-800 bg-gradient-to-b from-space-900 to-space-950 p-5 shadow-panel sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
            🌙 Live · updated when you open the page
          </p>
          <h2 id="moon-now-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
            The Moon right now
          </h2>
        </div>
        <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-xs text-slate-300">
          astronomy-engine · sub-arcminute
        </span>
      </div>

      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        {/* Computed moon disc. */}
        <div className="mx-auto text-center">
          <svg
            viewBox="-80 -80 160 160"
            width={168}
            height={168}
            role="img"
            aria-label={`Moon phase: ${data.name}, ${data.illumPct.toFixed(0)} percent illuminated`}
            className="drop-shadow-[0_0_24px_rgba(251,191,36,0.25)]"
          >
            <defs>
              <radialGradient id="moon-lit" cx="35%" cy="35%" r="80%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="60%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#fbbf24" />
              </radialGradient>
            </defs>
            <circle cx={0} cy={0} r={R} fill="#1e293b" />
            <path d={moonLitPath(data.phase, R)} fill="url(#moon-lit)" />
            <circle cx={0} cy={0} r={R} fill="none" stroke="#334155" strokeWidth={1} />
          </svg>
          <p className="mt-2 text-lg font-semibold text-slate-100">{data.name}</p>
          <p className="text-sm tabular-nums text-slate-300">
            {data.illumPct.toFixed(1)}% illuminated
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Illumination"
            value={`${data.illumPct.toFixed(1)}%`}
            sub="of the disc lit, as seen from Earth"
          />
          <Stat
            label="Phase angle"
            value={`${data.phase.toFixed(1)}°`}
            sub="0° new · 90° first quarter · 180° full"
          />
          <Stat
            label="Next full moon"
            value={data.nextFull ? fmtDateUtc(data.nextFull) : '—'}
            sub={data.nextFull ? 'UTC' : 'not found in 40 days'}
          />
          <Stat
            label="Next new moon"
            value={data.nextNew ? fmtDateUtc(data.nextNew) : '—'}
            sub={data.nextNew ? 'UTC' : 'not found in 40 days'}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Computed live in your browser — no image, no hard-coded date. A full
        lunar cycle takes about 29.5 days, which is why the Navigator window
        defaults to one lunar day.
      </p>
    </section>
  );
}
