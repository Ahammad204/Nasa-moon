import { Link } from 'react-router-dom';
import { hasMapPosition, missions } from '../../lib/missions';

// "Explore the Map" teaser — a wide card linking to /map. The site count
// is computed from the dataset (missions with coordinates), never
// hard-coded.

export default function MapTeaser() {
  const placed = missions.filter(hasMapPosition);
  const unplaced = missions.length - placed.length;

  return (
    <section aria-labelledby="map-teaser-heading" className="mt-8">
      <Link
        to="/map"
        className="group block overflow-hidden rounded-xl border border-space-800 bg-gradient-to-r from-space-900 via-space-950 to-space-900 p-5 shadow-panel hover:border-accent/50 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
              🗺️ Interactive Moon map · NASA LRO imagery
            </p>
            <h2
              id="map-teaser-heading"
              className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
            >
              {placed.length} landing sites on one Moon map
            </h2>
            <p className="mt-2 text-slate-300">
              Every CLPS landing site with known coordinates, pinned on a real
              NASA LRO mosaic. Drag to spin the Moon, click a marker for the
              mission. Jump straight into the Sun &amp; Earth Navigator
              from any site.
              {unplaced > 0 &&
                ` ${unplaced} of ${missions.length} missions have no coordinates yet, so they are listed below the map instead of placed on it.`}
            </p>
          </div>
          <span className="inline-flex min-h-[44px] shrink-0 items-center rounded-md bg-accent-dim px-5 text-sm font-medium text-white transition-transform group-hover:translate-x-1">
            Open the map →
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-slate-200">
            🌕 3D globe + flat map
          </span>
          <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-slate-200">
            📍 {placed.length} sites placed
          </span>
          <span className="rounded-full border border-space-700 bg-space-950 px-3 py-1.5 text-slate-200">
            🔗 Shareable map links
          </span>
        </div>
      </Link>
    </section>
  );
}
