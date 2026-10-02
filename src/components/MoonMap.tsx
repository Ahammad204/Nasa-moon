import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, type ReactNode } from 'react';
import { ImageOverlay, MapContainer, TileLayer, useMap } from 'react-leaflet';

const TREK_URL =
  'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg';
const STATIC_URL =
  'https://astrogeology.usgs.gov/ckan/dataset/db948a2d-4d6a-4775-a0d3-12613d36f9e7/resource/d24d5ef3-abc5-42ee-ac7c-4c3261106327/download/moon_lro_lroc-wac_mosaic_global_1024.jpg';
const ATTRIBUTION =
  'Basemap: NASA/LRO/LROC Team (Arizona State University) WAC global morphology mosaic, published by USGS Astrogeology Science Center — public domain, please cite authors.';

const FALLBACK_BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [-512, 1024],
];

interface Props {
  useFallback?: boolean;
  children?: ReactNode;
}

// Edge-to-edge fill. Two bugs left gutters around the Moon: Leaflet's
// init-time fit runs against a stale (pre-layout) container, and integer
// zoom snapping picks the largest whole zoom that fits — a 1024px world in a
// 1118px frame lands at z1 with 47px gutters. Instead compute the exact
// COVER zoom (world scaled to just overflow the frame; overflow-hidden crops
// the sub-pixel overhang, so a gap is geometrically impossible), refit on
// mount / after layout / on every resize, and pin minZoom to that zoom so
// zooming out can never re-open a gap. `floor` is the CRS floor: tiles can't
// go below z0 (a smaller frame then crops, which still fills).
function FitToContainer({ bounds, floor }: { bounds: L.LatLngBoundsExpression; floor: number }) {
  const map = useMap();
  useEffect(() => {
    const b = L.latLngBounds(bounds as L.LatLngBoundsLiteral);
    const fit = () => {
      map.invalidateSize();
      const size = map.getSize();
      const nw = map.project(b.getNorthWest(), 0);
      const se = map.project(b.getSouthEast(), 0); // east corner: NW/SW share a longitude
      const w0 = Math.abs(se.x - nw.x) || 1;
      const h0 = Math.abs(se.y - nw.y) || 1;
      // Every Leaflet CRS doubles scale per zoom level, so the zoom that maps
      // world-at-z0 onto the frame is log2 of the pixel ratio.
      const cover = Math.log2(Math.max(size.x / w0, size.y / h0));
      const z = Math.min(Math.max(cover, floor), map.getMaxZoom());
      map.setMinZoom(z);
      map.setView(b.getCenter(), z, { animate: false });
    };
    fit();
    const t = window.setTimeout(fit, 350);
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
    // bounds/floor are stable for the mount; refits belong to size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

// Hides the Moon tile source, CRS and fallback (D-012): Trek WMTS tiles on
// L.CRS.EPSG4326 (zoom 0-8), static WAC overlay on L.CRS.Simple when tiles fail.
export default function MoonMap({ useFallback = false, children }: Props) {
  return (
    <div className="h-full w-full" role="application" aria-label="Moon map">
      {useFallback ? (
        <MapContainer
          crs={L.CRS.Simple}
          bounds={L.latLngBounds(FALLBACK_BOUNDS)}
          boundsOptions={{ padding: [0, 0], animate: false }}
          zoomSnap={0}
          maxBounds={L.latLngBounds(FALLBACK_BOUNDS)}
          maxBoundsViscosity={1}
          className="h-full w-full"
        >
          <ImageOverlay url={STATIC_URL} bounds={FALLBACK_BOUNDS} attribution={ATTRIBUTION} />
          <FitToContainer bounds={FALLBACK_BOUNDS} floor={-10} />
          {children}
        </MapContainer>
      ) : (
        <MapContainer
          crs={L.CRS.EPSG4326}
          center={[0, 0]}
          zoom={1}
          zoomSnap={0}
          minZoom={0}
          maxZoom={8}
          maxBounds={L.latLngBounds([-90, -180], [90, 180])}
          maxBoundsViscosity={1}
          className="h-full w-full"
        >
          <TileLayer url={TREK_URL} attribution={ATTRIBUTION} noWrap minZoom={0} maxZoom={8} />
          <FitToContainer bounds={[[-90, -180], [90, 180]]} floor={0} />
          {children}
        </MapContainer>
      )}
    </div>
  );
}
