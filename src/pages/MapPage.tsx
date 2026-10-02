import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MapMarkers from '../components/MapMarkers';
import MoonMap from '../components/MoonMap';
import StatusBadge from '../components/StatusBadge';
import { getMissionById, hasMapPosition, missions } from '../lib/missions';
import type { Mission } from '../lib/types';
import { useMotionPrefs } from '../lib/motionPrefs';
import { hasWebGL } from '../lib/webgl';
import {
  requestGlobeCmd,
  selectFromScene,
  setMapMode,
  useSceneFlags,
} from '../three/sceneStore';

function rowClass(id: string, selectedId: string | null): string {
  return `flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
    id === selectedId ? 'border-accent/60 bg-accent-dim/30' : 'border-space-800 bg-space-900'
  }`;
}

// The selection readout docks inside the globe stage (K04): glass so the moon
// stays visible behind it, one component for the dock and deep-link states.
function SelectionInfo({ selected }: { selected?: Mission }) {
  return selected ? (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-medium">{selected.name}</span>
      <StatusBadge status={selected.status} />
      <span className="text-slate-400">{selected.landingSite?.name ?? '-'}</span>
      <Link to={`/mission/${selected.id}`} className="text-accent underline">
        Details -&gt;
      </Link>
    </div>
  ) : (
    <p className="text-slate-400">Select a marker (or a mission below) to see details.</p>
  );
}

const GLOBE_BUTTON =
  'min-h-[44px] rounded-md border border-space-700/70 bg-space-950/80 px-3 text-sm text-slate-200 backdrop-blur-md hover:bg-space-800';

export default function MapPage() {
  const [params] = useSearchParams();
  const { reduced } = useMotionPrefs();
  const { mapMode, selectedId } = useSceneFlags();
  const [leafletSel, setLeafletSel] = useState<string | null>(params.get('mission'));
  const can3D = hasWebGL() && !reduced;

  useEffect(() => {
    setMapMode(can3D ? 'globe' : 'flat');
  }, [can3D]);

  useEffect(() => {
    const p = params.get('mission');
    if (p) selectFromScene(p);
  }, [params]);

  const selected = selectedId ? getMissionById(selectedId) : undefined;
  const placed = missions.filter(hasMapPosition);
  const unplaced = missions.filter((m) => !hasMapPosition(m));
  const activeId = mapMode === 'globe' ? selectedId : leafletSel;
  const isGlobe = mapMode === 'globe' && can3D;

  const belowLists = (
    <>
      <h2 className="mb-2 mt-6 text-lg font-semibold">On this map ({placed.length})</h2>
      <ul className="pointer-events-auto mb-6 space-y-2">
        {placed.map((m) => (
          <li key={m.id} className={rowClass(m.id, activeId)}>
            <button
              type="button"
              onClick={() =>
                mapMode === 'globe' ? selectFromScene(m.id) : setLeafletSel(m.id)
              }
              className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
            >
              <span className="font-medium">{m.name}</span>
              <span className="text-slate-400">{m.landingSite?.name ?? '-'}</span>
            </button>
            <span className="flex items-center gap-3">
              <StatusBadge status={m.status} />
              <Link to={`/mission/${m.id}`} className="inline-flex min-h-[44px] items-center text-accent underline">
                Details -&gt;
              </Link>
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">No landing site data ({unplaced.length})</h2>
      <p className="mb-3 text-sm text-slate-400">
        These missions are not placed on the map — their sources give no coordinates.
      </p>
      <ul className="pointer-events-auto space-y-2">
        {unplaced.map((m) => (
          <li key={m.id} className={rowClass(m.id, activeId)}>
            <span className="flex-1">
              {m.name}
              {m.landingSite?.name ? ` — ${m.landingSite.name}` : ''}
              {m.landingSite?.coordinatesApproximate && m.landingSite?.name ? ' (approx)' : ''}
            </span>
            <span className="flex items-center gap-3">
              <StatusBadge status={m.status} />
              <Link to={`/mission/${m.id}`} className="inline-flex min-h-[44px] items-center text-accent underline">
                Details -&gt;
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <section>
      <div className="pointer-events-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Moon map</h1>
        {can3D && (
          <div className="flex overflow-hidden rounded-md border border-space-700 text-sm">
            {(['globe', 'flat'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mapMode === m}
                onClick={() => setMapMode(m)}
                className={`min-h-[44px] px-4 ${
                  mapMode === m ? 'bg-accent-dim text-white' : 'text-slate-300 hover:bg-space-900'
                }`}
              >
                {m === 'globe' ? '3D Globe' : 'Flat Map'}
              </button>
            ))}
          </div>
        )}
      </div>

      {isGlobe ? (
        // Globe stage: the center stays empty on purpose — the interactive moon
        // lives in the shared canvas behind it, with UI docked at the edges.
        <div className="relative h-[60vh] min-h-[360px] md:h-[72vh] md:min-h-[480px]">
          <div className="pointer-events-auto absolute left-0 top-0 flex w-[min(420px,100%)] flex-col items-start gap-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => requestGlobeCmd('left')} className={GLOBE_BUTTON}>
                Rotate left
              </button>
              <button type="button" onClick={() => requestGlobeCmd('right')} className={GLOBE_BUTTON}>
                Rotate right
              </button>
              <button type="button" onClick={() => requestGlobeCmd('in')} className={GLOBE_BUTTON}>
                Zoom in
              </button>
              <button type="button" onClick={() => requestGlobeCmd('out')} className={GLOBE_BUTTON}>
                Zoom out
              </button>
            </div>
            <p className="rounded-md border border-space-800/80 bg-space-950/70 px-2 py-1 text-xs text-slate-400 backdrop-blur-md">
              Drag to rotate · click a marker for details
            </p>
          </div>
          <div className="pointer-events-auto absolute bottom-0 left-0 min-h-[72px] w-[min(420px,100%)] rounded-lg border border-space-700/70 bg-space-950/85 p-3 text-sm shadow-panel backdrop-blur-md">
            <SelectionInfo selected={selected} />
          </div>
        </div>
      ) : (
        <>
          <div className="pointer-events-auto aspect-[2/1] overflow-hidden rounded-lg border border-space-800 shadow-panel ring-1 ring-space-700/50 transition-shadow duration-300 hover:shadow-glow hover:ring-accent/40">
            <MoonMap>
              <MapMarkers missions={placed} selectedId={leafletSel} onSelect={setLeafletSel} />
            </MoonMap>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Drag to pan · scroll to zoom · click a marker for details.
          </p>
        </>
      )}

      {isGlobe ? (
        // Solid band: the fixed moon must never show through list gaps while
        // the page scrolls over it — content stays readable on its own layer.
        // -mb-6 swallows main's bottom padding so the band meets the footer.
        <div className="pointer-events-auto relative z-10 -mx-4 -mb-6 border-t border-space-800 bg-space-950 px-4 pb-6 pt-4">
          <p className="mb-4 text-xs text-slate-400">
            Globe: stylized; markers are approximate feature centers (USGS Gazetteer). Basemap
            imagery credits: NASA/LRO/LROC WAC mosaic — see the footer (D-014).
          </p>
          {belowLists}
        </div>
      ) : (
        belowLists
      )}
    </section>
  );
}
