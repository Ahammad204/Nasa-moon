import { Link } from 'react-router-dom';
import { useInView } from '../lib/useInView';
import TiltCard from './TiltCard';

const FEATURES = [
  {
    to: '/missions',
    title: 'Missions',
    body: 'Search and filter every CLPS delivery — landers, dates, and status at a glance.',
  },
  {
    to: '/map',
    title: 'Map',
    body: 'See landing sites on an interactive NASA-tile Moon map.',
  },
  {
    to: '/compare',
    title: 'Compare',
    body: 'Put 2-3 missions side by side and spot the differences instantly.',
  },
  {
    to: '/payloads',
    title: 'Payloads',
    body: 'Browse payloads and see exactly which missions carried them.',
  },
];

export default function FeatureCards() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">Explore</h2>
      <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Link
            key={f.to}
            to={f.to}
            style={{ animationDelay: `${i * 60}ms` }}
            className={inView ? 'motion-safe:animate-fade-up' : 'opacity-0'}
          >
            <TiltCard className="h-full">
              <article className="flex h-full flex-col gap-2 rounded-lg border border-space-800 bg-space-900 p-5 shadow-panel transition-colors duration-200 hover:border-accent/50 hover:shadow-glow">
                <h3 className="text-lg">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.body}</p>
                <span className="mt-auto pt-2 text-sm text-accent">
                  Open {f.title} -&gt;
                </span>
              </article>
            </TiltCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
