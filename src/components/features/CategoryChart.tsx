// Lunar Feature Explorer — counts per category for the current filter
// (Phase 3b). Loaded lazily from FeaturesPage so Recharts stays out of
// the first chunk; the parent renders a text fallback while it loads.
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface CategoryCount {
  name: string;
  count: number;
  color: string;
}

export default function CategoryChart({ data }: { data: CategoryCount[] }) {
  const description = data.map((d) => `${d.name}: ${d.count}`).join(', ');
  return (
    <figure className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
      <figcaption className="mb-2 text-sm font-medium text-slate-300">
        Features per category (current filter)
      </figcaption>
      <div role="img" aria-label={`Features per category. ${description}`} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis
              dataKey="name"
              interval={0}
              angle={-30}
              textAnchor="end"
              height={64}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={40} />
            <Tooltip
              cursor={{ fill: '#162032' }}
              contentStyle={{
                background: '#101827',
                border: '1px solid #263349',
                color: '#e2e8f0',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
