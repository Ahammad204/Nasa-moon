// LROC QuickMap deep links (Science Context, Phase 5d).
// QuickMap accepts an `extent` query parameter: minLon,minLat,maxLon,maxLat
// in degrees, with `proj=10` (equidistant cylindrical). Verified 2026-11-12:
// https://quickmap.lroc.asu.edu/?extent=128.78,-90,130.78,-88.67&proj=10
// loads the QuickMap app centred on Shackleton crater (the crawler reports
// a WebGL warning, which means the app shell loaded and ran). The `layers`
// blob in some shared QuickMap URLs is an encoded layer state we do not
// reproduce — the plain extent form opens the default layers.

const QUICKMAP_BASE = 'https://quickmap.lroc.asu.edu/';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Deep link to QuickMap centred on a latitude/longitude, ±halfSpan degrees. */
export function quickMapUrl(lat: number, lon: number, halfSpan = 1): string {
  const minLon = clamp(lon - halfSpan, -180, 180);
  const maxLon = clamp(lon + halfSpan, -180, 180);
  const minLat = clamp(lat - halfSpan, -90, 90);
  const maxLat = clamp(lat + halfSpan, -90, 90);
  const extent = [minLon, minLat, maxLon, maxLat]
    .map((v) => Number(v.toFixed(2)))
    .join(',');
  return `${QUICKMAP_BASE}?extent=${extent}&proj=10`;
}
