import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../components/SourceBadge';
import { useMotionPrefs } from '../lib/motionPrefs';
import { moonConstants } from '../lib/moonConstants';
import {
  EARTH_GRAVITY,
  earthMoonLightTimeSeconds,
  earthMoonRoundTripSeconds,
  scaleReadingKg,
  weightOn,
} from '../lib/physics/physics';

// Moon Lab — try the Moon's physics yourself.
//
// Weight comes from the pure physics engine (1.624 m/s² on the Moon,
// 9.80665 m/s² on Earth); light time from c = 299,792.458 km/s across the
// mean 384,400 km distance. Bars animate unless motion is reduced.

const MAX_MASS_KG = 150;

function WeightBar({
  label,
  icon,
  newtons,
  scaleKg,
  maxNewtons,
  barClass,
  textClass,
  animate,
}: {
  label: string;
  icon: string;
  newtons: number;
  /** What a scale would read for this weight, in kg. */
  scaleKg: number;
  maxNewtons: number;
  barClass: string;
  textClass: string;
  animate: boolean;
}) {
  const pct = Math.min(100, (newtons / maxNewtons) * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-300">
          <span aria-hidden="true">{icon} </span>
          {label}
        </span>
        <span className={`font-semibold tabular-nums ${textClass}`}>
          {newtons.toFixed(1)} N · {scaleKg.toFixed(1)} kg
        </span>
      </div>
      <div
        className="h-4 overflow-hidden rounded-full bg-space-800"
        role="img"
        aria-label={`${label}: ${newtons.toFixed(1)} newtons — a scale would read ${scaleKg.toFixed(1)} kilograms`}
      >
        <div
          className={`h-full rounded-full ${barClass} ${animate ? 'transition-all duration-500' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MoonLabPage() {
  const { reduced } = useMotionPrefs();
  const [massKg, setMassKg] = useState(70);
  const moonN = useMemo(() => weightOn('moon', massKg), [massKg]);
  const earthN = useMemo(() => weightOn('earth', massKg), [massKg]);
  const moonKg = useMemo(() => scaleReadingKg('moon', massKg), [massKg]);
  const earthKg = useMemo(() => scaleReadingKg('earth', massKg), [massKg]);
  const maxEarthN = MAX_MASS_KG * EARTH_GRAVITY;
  const oneWay = earthMoonLightTimeSeconds();
  const roundTrip = earthMoonRoundTripSeconds();

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          🧪 Moon Lab
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Feel the Moon&apos;s gravity
        </h1>
        <p className="mt-2 text-base text-slate-300">
          The Moon pulls about six times weaker than Earth. Pick a mass and
          see what it would weigh up there, and how long a radio signal takes
          to make the trip home.
        </p>
      </header>

      <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel sm:p-5">
        <h2 className="text-lg font-semibold">Your weight on the Moon</h2>
        <label className="mt-3 block text-sm">
          <span className="mb-1 flex items-baseline justify-between">
            <span className="text-slate-400">Mass</span>
            <span className="font-semibold tabular-nums text-slate-100">
              {massKg} kg
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={MAX_MASS_KG}
            value={massKg}
            onChange={(e) => setMassKg(Number(e.target.value))}
            aria-label="Mass in kilograms"
            className="w-full accent-[#38bdf8]"
          />
        </label>
        <label className="mt-2 block text-sm">
          <span className="sr-only">Mass in kilograms (type a number)</span>
          <input
            type="number"
            min={1}
            max={MAX_MASS_KG}
            value={massKg}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setMassKg(Math.min(MAX_MASS_KG, Math.max(1, v)));
            }}
            className="min-h-[44px] w-32 rounded-md border border-space-700 bg-space-950 px-3 text-slate-100 tabular-nums"
          />
          <span className="ml-2 text-slate-400">kg (1–150)</span>
        </label>

        <div className="mt-4 space-y-4">
          <WeightBar
            label="On Earth"
            icon="🌍"
            newtons={earthN}
            scaleKg={earthKg}
            maxNewtons={maxEarthN}
            barClass="bg-sky-400"
            textClass="text-sky-300"
            animate={!reduced}
          />
          <WeightBar
            label="On the Moon"
            icon="🌙"
            newtons={moonN}
            scaleKg={moonKg}
            maxNewtons={maxEarthN}
            barClass="bg-amber-400"
            textClass="text-amber-300"
            animate={!reduced}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          The kg figure is what a scale would read — your mass stays{' '}
          {massKg} kg.
        </p>

        <p className="mt-4 text-sm text-slate-300">
          {massKg} kg weighs{' '}
          <span className="font-semibold tabular-nums text-amber-300">
            {moonN.toFixed(2)} N
          </span>{' '}
          on the Moon (a scale would read {moonKg.toFixed(1)} kg) versus{' '}
          <span className="font-semibold tabular-nums text-sky-300">
            {earthN.toFixed(2)} N
          </span>{' '}
          on Earth ({earthKg.toFixed(1)} kg on a scale). About one sixth. You
          would feel light, but your mass (and your inertia) would not change
          at all.
        </p>

        <svg
          viewBox="0 0 320 120"
          role="img"
          aria-label="Stylised figure standing on the Moon's surface with Earth in the sky — the kg figure beside the newtons is what a scale would read"
          className="mt-4 h-auto w-full"
        >
          <rect x={0} y={0} width={320} height={120} rx={8} fill="#05070d" />
          <circle cx={272} cy={26} r={14} fill="#38bdf8" />
          <circle cx={267} cy={22} r={4} fill="#0e4a6f" />
          <circle cx={276} cy={30} r={3} fill="#0e4a6f" />
          <path d="M0 100 Q160 88 320 100 L320 120 L0 120 Z" fill="#1c2740" />
          <g stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round" fill="none">
            <circle cx={80} cy={52} r={9} />
            <path d="M80 61 L80 88 M80 68 L66 78 M80 68 L94 78 M80 88 L70 104 M80 88 L90 104" />
          </g>
          <text x={110} y={72} fill="#fbbf24" fontSize={13}>
            {moonN.toFixed(1)} N · {moonKg.toFixed(1)} kg here
          </text>
          <text x={110} y={90} fill="#64748b" fontSize={11}>
            {earthN.toFixed(1)} N · {earthKg.toFixed(1)} kg on Earth
          </text>
        </svg>
      </div>

      <div className="mt-4 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel sm:p-5">
        <h2 className="text-lg font-semibold">📡 Signal delay to Earth</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-space-950 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-sky-300">
              {oneWay.toFixed(3)} s
            </p>
            <p className="text-sm text-slate-400">one way (mean distance)</p>
          </div>
          <div className="rounded-md bg-space-950 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-sky-300">
              {roundTrip.toFixed(3)} s
            </p>
            <p className="text-sm text-slate-400">round trip: ask, then wait</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-300">
          This is why direct-to-Earth comms windows matter for the challenge:{' '}
          <Link to="/navigator" className="text-accent underline">
            check when Earth is in view →
          </Link>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Mean distance; varies over the orbit.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel sm:p-5">
        <h2 className="text-lg font-semibold">Moon at a glance</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                Constant
              </th>
              <th className="border-b border-space-700 p-2 text-right font-medium text-slate-400">
                Value
              </th>
              <th className="border-b border-space-700 p-2 text-left font-medium text-slate-400">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {moonConstants.map((c) => (
              <tr key={c.id}>
                <td className="border-b border-space-800 p-2 align-top text-slate-100">
                  {c.label}
                  {c.note && (
                    <span className="block text-xs text-slate-400">{c.note}</span>
                  )}
                </td>
                <td className="border-b border-space-800 p-2 text-right align-top tabular-nums text-slate-200">
                  {c.display}
                </td>
                <td className="border-b border-space-800 p-2 align-top">
                  <SourceBadge ids={c.sourceIds} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">
          Idealised at the Moon&apos;s mean surface; local gravity varies slightly.
        </p>
      </div>
    </section>
  );
}
