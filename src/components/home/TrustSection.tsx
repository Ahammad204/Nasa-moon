import { Link } from 'react-router-dom';

// "Real Data, Nothing Guessed" — trust section. Every source listed here
// is actually used by the app (see docs/DATA_SOURCES.md); the honesty
// note repeats the rule the whole project runs on.

const SOURCES = [
  {
    icon: '🚀',
    name: 'NASA Science — CLPS Deliveries',
    use: 'Mission records: names, providers, landers, dates, status, outcomes.',
    url: 'https://science.nasa.gov/lunar-science/clps-deliveries/',
  },
  {
    icon: '🗺️',
    name: 'USGS Gazetteer of Planetary Nomenclature',
    use: 'Landing-site coordinates — feature centres, flagged approximate.',
    url: 'https://planetarynames.wr.usgs.gov/',
  },
  {
    icon: '🌕',
    name: 'NASA / LRO / LROC WAC mosaic',
    use: 'Moon basemap tiles on the map, via USGS Astrogeology.',
    url: 'https://astrogeology.usgs.gov/',
  },
  {
    icon: '🧮',
    name: 'astronomy-engine (MIT)',
    use: 'Sun & Moon positions behind every Sun/Earth number on this site.',
    url: 'https://github.com/cosinekitty/astronomy',
  },
];

export default function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="mt-8">
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5 shadow-panel sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          ✅ Our promise
        </p>
        <h2 id="trust-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
          Real data, nothing guessed
        </h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          Every number on this site traces back to a named source. When a
          coordinate or a date cannot be verified, it is stored as missing and
          shown as missing. Never filled in with a guess.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-space-800 bg-space-900 p-4 hover:border-emerald-400/50"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {s.icon}
                </span>
                <span>
                  <span className="block font-semibold text-slate-100">
                    {s.name} <span aria-hidden="true">↗</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-300">{s.use}</span>
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-space-800 bg-space-950 p-4 text-sm text-slate-300">
          <p>
            <span className="font-semibold text-slate-100">The fine print, up front: </span>
            Sun &amp; Earth figures are a geometric estimate — ideal flat horizon,
            terrain not included. Coordinates are approximate feature centres.
            Positions are good to about ±0.3°.{' '}
            <Link to="/south-pole" className="text-accent underline">
              See the full method →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
