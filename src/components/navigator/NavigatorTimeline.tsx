import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WindowSample } from '../../lib/astro';
import { fmtDeg, fmtUtc, fmtUtcShort } from './format';

const SUN = '#FBBF24';
const EARTH = '#38BDF8';
const BOTH = '#34D399';

interface Band {
  start: number;
  end: number;
  kind: 'sun' | 'earth' | 'both';
}

function buildBands(samples: WindowSample[]): Band[] {
  const bands: Band[] = [];
  let run: { kind: 'sun' | 'earth' | 'both'; start: number } | null = null;
  const close = (end: number) => {
    if (run) bands.push({ ...run, end });
    run = null;
  };
  for (let i = 0; i < samples.length - 1; i++) {
    const s = samples[i];
    const sunUp = s.sunEl >= 0;
    const earthUp = s.earthEl >= 0;
    const kind = sunUp && earthUp ? 'both' : sunUp ? 'sun' : earthUp ? 'earth' : null;
    if (kind === null) {
      close(s.t.getTime());
      continue;
    }
    if (run === null) run = { kind, start: s.t.getTime() };
    else if (run.kind !== kind) {
      close(s.t.getTime());
      run = { kind, start: s.t.getTime() };
    }
  }
  close(samples[samples.length - 1].t.getTime());
  return bands;
}

interface ChartPoint {
  ms: number;
  sunEl: number;
  earthEl: number;
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-space-700 bg-space-900 px-3 py-2 text-xs text-slate-200 shadow-panel">
      <p className="mb-1 tabular-nums text-slate-400">{fmtUtc(new Date(p.ms))}</p>
      <p>
        <span className="text-sun">● Sun {fmtDeg(p.sunEl)}</span>
      </p>
      <p>
        <span className="text-accent">● Earth {fmtDeg(p.earthEl)}</span>
      </p>
    </div>
  );
}

/**
 * Sun/Earth elevation over the window (Recharts, lazy-loaded with the page).
 * Green/amber/blue bands mark where each body — or both together — is up;
 * the white cursor follows the time slider.
 */
export default function NavigatorTimeline({
  samples,
  currentMs,
}: {
  samples: WindowSample[];
  currentMs: number;
}) {
  const { points, bands, summary } = useMemo(() => {
    if (samples.length === 0) {
      return { points: [] as ChartPoint[], bands: [] as Band[], summary: 'No data for this window.' };
    }
    const stride = Math.max(1, Math.ceil(samples.length / 360));
    const points: ChartPoint[] = [];
    for (let i = 0; i < samples.length; i += stride) {
      points.push({
        ms: samples[i].t.getTime(),
        sunEl: Math.round(samples[i].sunEl * 10) / 10,
        earthEl: Math.round(samples[i].earthEl * 10) / 10,
      });
    }
    const last = samples[samples.length - 1];
    if (points[points.length - 1].ms !== last.t.getTime()) {
      points.push({
        ms: last.t.getTime(),
        sunEl: Math.round(last.sunEl * 10) / 10,
        earthEl: Math.round(last.earthEl * 10) / 10,
      });
    }
    const sunEls = samples.map((s) => s.sunEl);
    const earthEls = samples.map((s) => s.earthEl);
    const summary =
      `Sun elevation ${fmtDeg(Math.min(...sunEls))} to ${fmtDeg(Math.max(...sunEls))}; ` +
      `Earth elevation ${fmtDeg(Math.min(...earthEls))} to ${fmtDeg(Math.max(...earthEls))}.`;
    return { points, bands: buildBands(samples), summary };
  }, [samples]);

  const startMs = samples.length > 0 ? samples[0].t.getTime() : 0;
  const endMs = samples.length > 0 ? samples[samples.length - 1].t.getTime() : 0;

  return (
    <figure className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
      <figcaption className="mb-1 text-sm font-medium text-slate-300">
        Elevation timeline
      </figcaption>
      <p className="mb-2 text-xs text-slate-400">
        Amber band: Sun up · Blue band: Earth up · Green band: both up (powered +
        communicating).
      </p>
      <div role="img" aria-label={`Elevation timeline. ${summary}`} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#1c2740" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ms"
              type="number"
              domain={[startMs, endMs]}
              tickFormatter={(ms: number) => fmtUtcShort(new Date(ms))}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickCount={5}
            />
            <YAxis
              domain={[-90, 90]}
              ticks={[-90, -45, 0, 45, 90]}
              tickFormatter={(v: number) => `${v}°`}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={40}
            />
            <Tooltip content={<TooltipContent />} />
            {bands.map((b, i) => (
              <ReferenceArea
                key={`${b.kind}-${i}`}
                x1={b.start}
                x2={b.end}
                fill={b.kind === 'both' ? BOTH : b.kind === 'sun' ? SUN : EARTH}
                fillOpacity={b.kind === 'both' ? 0.14 : 0.08}
                strokeOpacity={0}
              />
            ))}
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
            <ReferenceLine
              x={currentMs}
              stroke="#f1f5f9"
              strokeWidth={1.5}
              label={{ value: 'now', position: 'insideTopRight', fill: '#e2e8f0', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="sunEl"
              name="Sun"
              stroke={SUN}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="earthEl"
              name="Earth"
              stroke={EARTH}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
