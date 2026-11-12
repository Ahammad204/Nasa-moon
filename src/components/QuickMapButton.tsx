import { quickMapUrl } from '../lib/quickmap';

/**
 * "Open in LROC QuickMap" button (Science Context, Phase 5d). The URL uses
 * QuickMap's documented `?extent=minLon,minLat,maxLon,maxLat&proj=10`
 * form; the format was verified 2026-11-12 against a Shackleton link that
 * loads the QuickMap app.
 */
export default function QuickMapButton({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  return (
    <a
      href={quickMapUrl(latitude, longitude)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center rounded-lg border border-space-700 bg-space-950 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-space-800"
    >
      Open {label} in LROC QuickMap ↗
    </a>
  );
}
