import { countByProvider, countByStatus } from '../lib/charts';
import { missions } from '../lib/missions';
import { useInView } from '../lib/useInView';
import CountUp from './CountUp';

const STATS = [
  { label: 'Missions', value: missions.length },
  { label: 'Completed', value: countByStatus(missions).find((d) => d.name === 'completed')?.count ?? 0 },
  { label: 'Payloads', value: missions.reduce((sum, m) => sum + m.payloads.length, 0) },
  {
    label: 'Providers',
    value: countByProvider(missions).filter((d) => d.name !== 'unknown').length,
  },
];

export default function StatsStrip() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="mb-14">
      <div ref={ref} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map(({ label, value }, i) => (
          <div
            key={label}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`rounded-lg border border-space-800 bg-space-900 p-4 text-center shadow-panel ${
              inView ? 'motion-safe:animate-fade-up' : 'opacity-0'
            }`}
          >
            <p className="text-3xl font-semibold text-accent">
              <CountUp value={value} whenVisible />
            </p>
            <p className="mt-1 text-sm text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
