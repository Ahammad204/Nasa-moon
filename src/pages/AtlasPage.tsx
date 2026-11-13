import { Link } from 'react-router-dom';
import QuickMapButton from '../components/QuickMapButton';
import SourceBadge from '../components/SourceBadge';
import { atlasFeatures } from '../lib/atlas';
import { getSourceById } from '../lib/sources';

// Lunar Atlas (Science Context, Phase 5b). Three featured stories; every
// number comes from the USGS Gazetteer or a NASA Science page. Unverified
// values are null in the data and render here as "not verified".

function FactRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-space-800 py-2 text-sm last:border-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium tabular-nums">
        {value ?? <span className="text-slate-500">not verified</span>}
      </dd>
    </div>
  );
}

export default function AtlasPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium uppercase tracking-wider text-accent">Science Context</p>
      <h1 className="mt-1 text-3xl font-bold">Lunar Atlas</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-300">
        Three places that tell the Moon&apos;s story: a young crater that drilled
        into the crust, the largest basin in the solar system, and the brightest
        crater on the near side. Numbers are from the USGS Gazetteer of Planetary
        Nomenclature and NASA Science; anything not verified there is marked
        &ldquo;not verified&rdquo; instead of guessed.
      </p>

      <div className="mt-6 space-y-6">
        {atlasFeatures.map((feature) => {
          const gazetteer = feature.gazetteerFeatureId
            ? getSourceById('usgs-gazetteer')
            : undefined;
          // The feature's own Gazetteer record button below IS its Gazetteer
          // source link — showing the generic "USGS Gazetteer" pill as well
          // duplicated the label. Drop the pill when the record button exists.
          const badgeIds = feature.gazetteerFeatureId
            ? feature.sourceIds.filter((id) => id !== 'usgs-gazetteer')
            : feature.sourceIds;
          const flyTo = `/map?lat=${feature.latitude}&lon=${feature.longitude}&name=${encodeURIComponent(feature.name)}`;
          return (
            <article
              key={feature.id}
              className="rounded-xl border border-space-700 bg-space-900 p-5"
            >
              <h2 className="text-xl font-semibold">{feature.name}</h2>
              <p className="text-sm text-slate-400">
                {feature.featureType} · {feature.latitude}°, {feature.longitude}°
              </p>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {feature.narrative}
              </p>
              <dl className="mt-4">
                <FactRow
                  label="Diameter"
                  value={
                    feature.diameterKm != null
                      ? `about ${feature.diameterKm.toLocaleString()} km`
                      : null
                  }
                />
                <FactRow
                  label="Depth"
                  value={feature.depthKm != null ? `about ${feature.depthKm} km` : null}
                />
                <FactRow label="Age" value={feature.age} />
              </dl>
              <p className="mt-3 text-sm text-slate-400">{feature.note}</p>
              <div className="mt-3">
                <SourceBadge ids={badgeIds} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={flyTo}
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-space-950 hover:brightness-110"
                >
                  Fly to {feature.name} on the map →
                </Link>
                <QuickMapButton
                  latitude={feature.latitude}
                  longitude={feature.longitude}
                  label={feature.name}
                />
                {gazetteer && feature.gazetteerFeatureId && (
                  <a
                    href={`https://planetarynames.wr.usgs.gov/Feature/${feature.gazetteerFeatureId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-space-700 bg-space-950 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-space-800"
                  >
                    USGS Gazetteer ↗
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-sm">
        <Link to="/moon-interior" className="text-accent underline">
          Inside the Moon →
        </Link>{' '}
        ·{' '}
        <Link to="/library" className="text-accent underline">
          Research Library
        </Link>
      </p>
    </main>
  );
}
