import { useMemo } from 'react';
import { getSunEarthState } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import { fmtAzimuth, fmtDeg } from './format';

/**
 * SVG sky plot — the signature visual. Zenith at the centre, the horizon is
 * the outer circle, azimuth runs clockwise from north (top). A body below
 * the horizon is drawn dimmed just outside the horizon circle so the reader
 * can still see where it is. A dotted trail shows each body's path over the
 * last/next 24 h (hourly samples).
 *
 * Colour is never the only signal: markers are labelled "Sun"/"Earth" in the
 * legend and the figure carries a text description for screen readers.
 */

const SUN = '#FBBF24';
const EARTH = '#38BDF8';
const SIZE = 320;
const C = SIZE / 2;
const R = 132;

interface Marker {
  azimuth: number;
  elevation: number;
}

function toXY(m: Marker): { x: number; y: number; up: boolean } {
  const az = (m.azimuth * Math.PI) / 180;
  const up = m.elevation >= 0;
  // Radius grows as the body sinks: at the horizon r = R, below it the
  // marker drifts outward (clamped so it stays inside the viewBox).
  const r = Math.min(R * 1.14, ((90 - m.elevation) / 90) * R);
  return { x: C + r * Math.sin(az), y: C - r * Math.cos(az), up };
}

function Trail({
  points,
  color,
  label,
}: {
  points: Marker[];
  color: string;
  label: string;
}) {
  const d = points
    .map((p, i) => {
      const { x, y } = toXY(p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeDasharray="2 3"
      opacity="0.55"
      aria-hidden="true"
    >
      <title>{`${label} trail, last/next 24 h`}</title>
    </path>
  );
}

function BodyMarker({
  marker,
  color,
  label,
  glyph,
}: {
  marker: Marker;
  color: string;
  label: string;
  glyph: string;
}) {
  const { x, y, up } = toXY(marker);
  return (
    <g opacity={up ? 1 : 0.35} aria-hidden="true">
      {up && (
        <circle cx={x} cy={y} r={13} fill={color} opacity={0.18} />
      )}
      <circle cx={x} cy={y} r={8} fill={color} stroke="#0a0e17" strokeWidth="1.5" />
      <text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#0a0e17"
      >
        {glyph}
      </text>
      <title>
        {`${label}: azimuth ${fmtAzimuth(marker.azimuth)}, elevation ${fmtDeg(marker.elevation)}${up ? '' : ' (below horizon)'}`}
      </title>
    </g>
  );
}

export default function HorizonDiagram({
  site,
  date,
  sun,
  earth,
  size = SIZE,
}: {
  site: Site;
  /** Current instant (UTC). */
  date: Date;
  sun: Marker;
  earth: Marker;
  size?: number;
}) {
  // Hourly trail for ±24 h around the current instant.
  const trail = useMemo(() => {
    const sunTrail: Marker[] = [];
    const earthTrail: Marker[] = [];
    for (let h = -24; h <= 24; h++) {
      const t = new Date(date.getTime() + h * 3_600_000);
      const s = getSunEarthState(site, t);
      sunTrail.push({ azimuth: s.sun.azimuth, elevation: s.sun.elevation });
      earthTrail.push({ azimuth: s.earth.azimuth, elevation: s.earth.elevation });
    }
    return { sunTrail, earthTrail };
  }, [site, date]);

  const description =
    `Sky plot for the site. Sun: azimuth ${fmtAzimuth(sun.azimuth)}, ` +
    `elevation ${fmtDeg(sun.elevation)} (${sun.elevation >= 0 ? 'above' : 'below'} the horizon). ` +
    `Earth: azimuth ${fmtAzimuth(earth.azimuth)}, ` +
    `elevation ${fmtDeg(earth.elevation)} (${earth.elevation >= 0 ? 'above' : 'below'} the horizon).`;

  return (
    <figure className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
      <figcaption className="mb-1 text-sm font-medium text-slate-300">
        Horizon diagram
      </figcaption>
      <p className="mb-2 text-xs text-slate-400">
        Zenith at the centre, horizon at the edge. Dotted trails: last/next 24 h.
      </p>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={size}
        height={size}
        role="img"
        aria-label={description}
        className="mx-auto block max-w-full"
      >
        <title>Horizon diagram</title>
        <desc>{description}</desc>
        {/* Sky dome rings: 30° and 60° elevation. */}
        <circle cx={C} cy={C} r={R} fill="#0b1020" stroke="#263349" strokeWidth="1.5" />
        <circle cx={C} cy={C} r={(R * 2) / 3} fill="none" stroke="#1c2740" strokeWidth="1" />
        <circle cx={C} cy={C} r={R / 3} fill="none" stroke="#1c2740" strokeWidth="1" />
        <circle cx={C} cy={C} r={R * 1.14} fill="none" stroke="#263349" strokeWidth="1" strokeDasharray="4 4" />
        {/* Compass ticks. */}
        {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
          const a = (i * 90 * Math.PI) / 180;
          const x = C + (R + 16) * Math.sin(a);
          const y = C - (R + 16) * Math.cos(a);
          return (
            <text
              key={label}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#94a3b8"
            >
              {label}
            </text>
          );
        })}
        <text x={C + 6} y={C - R / 3 + 4} fontSize="9" fill="#64748b">
          60°
        </text>
        <text x={C + 6} y={C - (R * 2) / 3 + 4} fontSize="9" fill="#64748b">
          30°
        </text>
        <Trail points={trail.sunTrail} color={SUN} label="Sun" />
        <Trail points={trail.earthTrail} color={EARTH} label="Earth" />
        <BodyMarker marker={sun} color={SUN} label="Sun" glyph="☀" />
        <BodyMarker marker={earth} color={EARTH} label="Earth" glyph="⊕" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-300">
        <span>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-sun align-middle" aria-hidden="true" />
          Sun {fmtDeg(sun.elevation)} · {fmtAzimuth(sun.azimuth)}
          {sun.elevation < 0 ? ' (below horizon)' : ''}
        </span>
        <span>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-accent align-middle" aria-hidden="true" />
          Earth {fmtDeg(earth.elevation)} · {fmtAzimuth(earth.azimuth)}
          {earth.elevation < 0 ? ' (below horizon)' : ''}
        </span>
      </div>
    </figure>
  );
}
