import { Link } from 'react-router-dom';

// "How It Works" — three static steps. No data needed; the links point at
// the real pages that do each job.

const STEPS = [
  {
    n: '1',
    icon: '📍',
    title: 'Pick a site',
    body: 'Choose a CLPS landing site or an Artemis III candidate region at the lunar south pole.',
    to: '/south-pole',
    cta: 'Browse south-pole sites →',
  },
  {
    n: '2',
    icon: '📅',
    title: 'Pick a date',
    body: 'Set any date and time in UTC, then scrub across a full lunar day: 29.5 days of Sun and Earth.',
    to: '/navigator',
    cta: 'Open the Navigator →',
  },
  {
    n: '3',
    icon: '☀️',
    title: 'See the Sun & Earth',
    body: 'Read the elevation, the time to sunset and Earthset, and how many hours the site gets power and contact.',
    to: '/map',
    cta: 'See it on the Moon map →',
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
        🧭 Start here
      </p>
      <h2 id="how-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
        How it works
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <article
            key={s.n}
            className="relative overflow-hidden rounded-lg border border-space-800 bg-space-900 p-5 shadow-panel"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -top-4 select-none text-7xl font-bold text-space-800"
            >
              {s.n}
            </span>
            <div className="relative">
              <div className="text-2xl" aria-hidden="true">
                {s.icon}
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-100">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{s.body}</p>
              <Link
                to={s.to}
                className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-accent underline underline-offset-2"
              >
                {s.cta}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
