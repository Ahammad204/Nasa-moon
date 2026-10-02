import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { Mission } from '../lib/types';
import StatusBadge from './StatusBadge';

const ICON_NORMAL = L.divIcon({
  className: '',
  html: '<span class="block h-3.5 w-3.5 rounded-full border border-space-950 bg-slate-100 shadow-[0_0_0_1px_rgba(10,14,23,0.6)]" aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const ICON_SELECTED = L.divIcon({
  className: '',
  html: '<span class="block h-[18px] w-[18px] rounded-full border border-space-950 bg-accent shadow-glow motion-safe:animate-marker-pulse" aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function positionOf(m: Mission): [number, number] {
  return [m.landingSite!.latitude!, m.landingSite!.longitude!];
}

function FocusOnSelect({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 4));
  }, [map, position]);
  return null;
}

function SelectableMarker({
  mission,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => {
    if (selected) ref.current?.openPopup();
  }, [selected]);

  return (
    <Marker
      ref={ref}
      position={positionOf(mission)}
      icon={selected ? ICON_SELECTED : ICON_NORMAL}
      title={mission.name}
      eventHandlers={{ click: () => onSelect(mission.id) }}
    >
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">{mission.name}</p>
          <p className="text-slate-400">
            {mission.landingSite?.name ?? '-'}
            {mission.landingSite?.coordinatesApproximate && mission.landingSite?.name
              ? ' (approx)'
              : ''}
          </p>
          <p className="mt-1">
            <StatusBadge status={mission.status} />
          </p>
          <Link
            to={`/mission/${mission.id}`}
            className="mt-1 inline-flex min-h-[44px] items-center text-accent underline"
          >
            Details -&gt;
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapMarkers({
  missions,
  selectedId,
  onSelect,
}: {
  missions: Mission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const focus = useMemo<[number, number] | null>(() => {
    const sel = missions.find((m) => m.id === selectedId);
    return sel ? positionOf(sel) : null;
  }, [missions, selectedId]);

  return (
    <>
      <FocusOnSelect position={focus} />
      {missions.map((m) => (
        <SelectableMarker
          key={m.id}
          mission={m}
          selected={m.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
