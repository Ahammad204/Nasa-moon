// Lunar Feature Explorer — Leaflet map (Phase 3b).
//
// Reuses the MoonMap setup (L.CRS.EPSG4326, NASA LRO WAC tiles, same
// attribution). Two modes: a density heat map (one Rectangle per
// non-empty grid cell, colour = features per 1000 km^2) and individual
// CircleMarkers (only when the filter yields <= 500 features or the map
// is zoomed to >= 3 — the parent decides and passes the capped list).
//
// At 2.5° cells there are ~5,000 non-empty cells, too many SVG paths to
// stay smooth, so that cell size switches the map to Leaflet's canvas
// renderer (the map remounts on the switch). Canvas paths are not
// keyboard-focusable; the feature list stays fully keyboard-operable,
// and at the default 5° / 10° sizes the SVG renderer keeps cells
// focusable (keyboard: true, Enter activates).
import L from 'leaflet';
import { memo } from 'react';
import { CircleMarker, Popup, Rectangle, Tooltip, useMapEvents } from 'react-leaflet';
import MoonMap from '../MoonMap';
import { densityColor, formatDensity } from '../../lib/features/density';
import type { GridCell, LunarFeatureRecord } from '../../lib/features/engine';
import { CATEGORY_COLORS } from '../../lib/features/categories';
import type { Mission } from '../../lib/types';

export interface FeaturesMapProps {
  cells: GridCell[];
  maxDensity: number;
  opacity: number;
  mode: 'heat' | 'markers';
  /** Filtered features to draw as markers (parent caps at 500). */
  markers: LunarFeatureRecord[];
  /** True when markers are hidden: too many features and not zoomed in. */
  markersBlocked: boolean;
  blockedCount: number;
  cellDeg: 2.5 | 5 | 10;
  selectedCellId: string | null;
  selectedFeatureId: number | null;
  showMissions: boolean;
  missionsWithCoords: Mission[];
  pickingNearPoint: boolean;
  nearPoint: { lat: number; lon: number; radiusKm: number } | null;
  onCellClick: (cellId: string) => void;
  onFeatureClick: (feature: LunarFeatureRecord) => void;
  onMissionClick: (mission: Mission) => void;
  onMapClick: (lat: number, lon: number) => void;
  onZoomChange: (zoom: number) => void;
}

function MapEvents({
  pickingNearPoint,
  onMapClick,
  onZoomChange,
}: {
  pickingNearPoint: boolean;
  onMapClick: (lat: number, lon: number) => void;
  onZoomChange: (zoom: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (pickingNearPoint) onMapClick(e.latlng.lat, e.latlng.lng);
    },
    zoomend(e) {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

function cellLabel(cell: GridCell): string {
  return `lat ${cell.latMin}° to ${cell.latMax}°, lon ${cell.lonMin}° to ${cell.lonMax}°`;
}

const CellLayer = memo(function CellLayer({
  cells,
  maxDensity,
  opacity,
  selectedCellId,
  onCellClick,
}: {
  cells: GridCell[];
  maxDensity: number;
  opacity: number;
  selectedCellId: string | null;
  onCellClick: (cellId: string) => void;
}) {
  return (
    <>
      {cells.map((cell) => {
        const selected = cell.id === selectedCellId;
        return (
          <Rectangle
            key={cell.id}
            bounds={[
              [cell.latMin, cell.lonMin],
              [cell.latMax, cell.lonMax],
            ]}
            // `keyboard` is a real Leaflet Path option (focusable path,
            // Enter activates) that @types/leaflet 1.9 omits from
            // PathOptions, hence the cast.
            pathOptions={
              {
                color: selected ? '#f8fafc' : '#0a0e17',
                weight: selected ? 2 : 0.5,
                fillColor: densityColor(cell.densityPer1000Km2, maxDensity),
                // Faint cells stay visible; the densest stay below opaque so
                // the basemap still reads through.
                fillOpacity: opacity * (0.25 + 0.65 * Math.min(1, cell.count / 10)),
                keyboard: true,
              } as L.PathOptions
            }
            eventHandlers={{ click: () => onCellClick(cell.id) }}
          >
            <Tooltip sticky>
              <span>
                {cellLabel(cell)}
                <br />
                {cell.count} {cell.count === 1 ? 'feature' : 'features'} ·{' '}
                {formatDensity(cell.densityPer1000Km2)} per 1000 km²
              </span>
            </Tooltip>
          </Rectangle>
        );
      })}
    </>
  );
});

export default function FeaturesMap(props: FeaturesMapProps) {
  const {
    cells,
    maxDensity,
    opacity,
    mode,
    markers,
    markersBlocked,
    blockedCount,
    cellDeg,
    selectedCellId,
    selectedFeatureId,
    showMissions,
    missionsWithCoords,
    pickingNearPoint,
    nearPoint,
    onCellClick,
    onFeatureClick,
    onMissionClick,
    onMapClick,
    onZoomChange,
  } = props;

  // Canvas renderer only for the dense 2.5° grid; the map remounts when
  // the renderer mode changes (renderer is a creation-time option).
  const preferCanvas = cellDeg === 2.5;

  return (
    <div
      className="relative h-[50vh] min-h-[320px] w-full overflow-hidden rounded-lg border border-space-800 shadow-panel md:h-[62vh]"
      aria-label="Lunar feature heat map"
    >
      <MoonMap key={preferCanvas ? 'canvas' : 'svg'} preferCanvas={preferCanvas}>
        <MapEvents
          pickingNearPoint={pickingNearPoint}
          onMapClick={onMapClick}
          onZoomChange={onZoomChange}
        />
        {mode === 'heat' && (
          <CellLayer
            cells={cells}
            maxDensity={maxDensity}
            opacity={opacity}
            selectedCellId={selectedCellId}
            onCellClick={onCellClick}
          />
        )}
        {mode === 'markers' &&
          !markersBlocked &&
          markers.map((f) => {
            const selected = f.id === selectedFeatureId;
            return (
              <CircleMarker
                key={f.id}
                center={[f.lat, f.lon]}
                radius={selected ? 8 : 5}
                pathOptions={{
                  color: selected ? '#f8fafc' : '#0a0e17',
                  weight: selected ? 2 : 1,
                  fillColor: CATEGORY_COLORS[f.category],
                  fillOpacity: 0.9,
                }}
                eventHandlers={{ click: () => onFeatureClick(f) }}
              >
                <Tooltip>
                  {f.name} — {f.category}
                  {f.diameterKm !== null ? ` · ${f.diameterKm} km` : ''}
                </Tooltip>
              </CircleMarker>
            );
          })}
        {showMissions &&
          missionsWithCoords.map((m) => (
            <CircleMarker
              key={m.id}
              center={[m.landingSite!.latitude!, m.landingSite!.longitude!]}
              radius={7}
              pathOptions={{
                color: '#0a0e17',
                weight: 1,
                fillColor: '#fbbf24',
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-slate-400">{m.landingSite?.name ?? 'Landing site'}</p>
                  <button
                    type="button"
                    onClick={() => onMissionClick(m)}
                    className="mt-2 inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-3 text-sm text-white"
                  >
                    Use as near point
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        {nearPoint && (
          <CircleMarker
            center={[nearPoint.lat, nearPoint.lon]}
            radius={9}
            pathOptions={{
              color: '#f8fafc',
              weight: 2,
              fillColor: '#fb7185',
              fillOpacity: 0.7,
            }}
          >
            <Tooltip>
              Near point: {nearPoint.lat.toFixed(2)}°, {nearPoint.lon.toFixed(2)}° · within{' '}
              {nearPoint.radiusKm} km
            </Tooltip>
          </CircleMarker>
        )}
      </MoonMap>
      {mode === 'markers' && markersBlocked && (
        <p
          role="status"
          className="pointer-events-none absolute left-2 top-2 max-w-[90%] rounded-md border border-space-700 bg-space-950/90 px-3 py-2 text-xs text-slate-200"
        >
          {blockedCount.toLocaleString('en-US')} features match — zoom in to zoom level 3 or
          higher, or narrow the filters to 500 or fewer, to see individual markers.
        </p>
      )}
      {pickingNearPoint && (
        <p
          role="status"
          className="pointer-events-none absolute bottom-2 left-2 max-w-[90%] rounded-md border border-accent/50 bg-space-950/90 px-3 py-2 text-xs text-slate-200"
        >
          Click the map to set the near point.
        </p>
      )}
    </div>
  );
}
