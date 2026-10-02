import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { countByProvider, countByStatus, type ChartDatum } from '../lib/charts';
import type { Mission } from '../lib/types';

function describeData(data: ChartDatum[]): string {
  return data.map((d) => `${d.name}: ${d.count}`).join(', ');
}

// Long provider names collide horizontally at phone widths — tilt them instead.
function useNarrowLabels(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return narrow;
}

function Chart({
  title,
  data,
  color,
}: {
  title: string;
  data: ChartDatum[];
  color: string;
}) {
  const narrow = useNarrowLabels();
  return (
    <figure className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
      <figcaption className="mb-2 text-sm font-medium text-slate-300">{title}</figcaption>
      <div role="img" aria-label={`${title}. ${describeData(data)}`} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: narrow ? 4 : 8, left: narrow ? 64 : 8 }}
          >
            <XAxis
              dataKey="name"
              interval={0}
              angle={narrow ? -40 : undefined}
              textAnchor={narrow ? 'end' : undefined}
              height={narrow ? 68 : 30}
              tick={{ fill: '#94a3b8', fontSize: narrow ? 10 : 11 }}
            />
            <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={28} />
            <Tooltip
              cursor={{ fill: '#162032' }}
              contentStyle={{ background: '#101827', border: '1px solid #263349', color: '#e2e8f0' }}
            />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export default function ChartsPanel({ missions }: { missions: Mission[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-1 text-lg font-semibold">Charts</h2>
      <p className="mb-3 text-sm text-slate-400">Charts reflect the active search and filters.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Chart title="Missions by status" data={countByStatus(missions)} color="#38bdf8" />
        <Chart title="Missions by provider" data={countByProvider(missions)} color="#7dd3fc" />
      </div>
    </section>
  );
}
