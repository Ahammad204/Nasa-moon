// Lunar Feature Explorer — 3D globe geometry helpers (pure TS, no React).
//
// These are the only lat/lon <-> sphere conversions the globe view uses.
// The projection is NOT reinvented here: every position comes from
// latLonToVector3 (three/primitives/Marker3D), the app's established
// east-positive convention (x = R cos lat cos lon, y = R sin lat,
// z = R cos lat sin lon). The inverse is its exact algebraic inverse
// (lat = asin(y/r), lon = atan2(z, x)); globeGeometry.test.ts pins the
// round-trip, the patch centre/corners, the facing formula and the zoom
// mapping, so any drift in this convention fails a test before it ships.

import * as THREE from 'three';
import { latLonToVector3 } from '../../three/primitives/Marker3D';

/** Pitch clamp for globe drag / facing, radians (same as MapScene). */
export const GLOBE_PITCH_CLAMP = 1.1;

/** Globe zoom range in the page's own units (same units as the flat map's
 *  onZoomChange, so the parent's markers-blocked gate works identically
 *  in both views; zoomed means >= 3). */
export const GLOBE_ZOOM_MIN = 1;
export const GLOBE_ZOOM_MAX = 7;
export const GLOBE_ZOOMED_THRESHOLD = 3;

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Inverse of latLonToVector3: a sphere point back to latitude/longitude
 * (degrees, lon in [-180, 180]). At the poles longitude is undefined —
 * atan2(0, 0) yields 0, which is the convention the round-trip test pins.
 */
export function vectorToLatLon(v: { x: number; y: number; z: number }): LatLon {
  const r = Math.hypot(v.x, v.y, v.z);
  const lat = (Math.asin(Math.max(-1, Math.min(1, v.y / r))) * 180) / Math.PI;
  const lon = (Math.atan2(v.z, v.x) * 180) / Math.PI;
  return { lat, lon };
}

/**
 * Yaw/pitch that turns the globe to face a lat/lon (same formula as
 * MapScene: yaw = lon - PI/2, pitch = lat clamped to +/-1.1 rad).
 * Derivation: Rx(pitch).Ry(yaw) maps (cos lat cos lon, sin lat,
 * cos lat sin lon) -> +Z exactly when yaw = lon - PI/2 and pitch = lat.
 */
export function facingForLatLon(lat: number, lon: number): { yaw: number; pitch: number } {
  return {
    yaw: (lon * Math.PI) / 180 - Math.PI / 2,
    pitch: Math.max(
      -GLOBE_PITCH_CLAMP,
      Math.min(GLOBE_PITCH_CLAMP, (lat * Math.PI) / 180),
    ),
  };
}

export function clampGlobeZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return GLOBE_ZOOM_MIN;
  return Math.max(GLOBE_ZOOM_MIN, Math.min(GLOBE_ZOOM_MAX, zoom));
}

/**
 * Zoom value -> globe group scale. Monotonic, 1 at zoom 1, 2.2 at zoom 7.
 * The 2.2 cap is deliberate: with the camera at z = 5.6 and the moon at
 * R = 2.1, the front surface stays at 5.6 - 2.2*2.1 = 0.98 in front of
 * the camera — scaling any further would put the camera inside the globe.
 */
export function zoomToGroupScale(zoom: number): number {
  return 1 + (clampGlobeZoom(zoom) - 1) * 0.2;
}

export interface CellPatch {
  /** (segments+1)^2 vertices on the sphere at `radius`, row-major by
   *  latitude then longitude. */
  positions: Float32Array;
  /** Outward-facing triangles (see buildCellPatch). */
  indices: Uint32Array;
  /** Exact centre of the patch: latLonToVector3(mid lat, mid lon, radius). */
  center: THREE.Vector3;
}

/**
 * A true spherical-surface patch for one lat/lon cell: a subdivided grid
 * whose vertices sit exactly on the sphere (latLonToVector3 at `radius`),
 * so the patch curves with the Moon instead of cutting across it as a
 * flat quad. Winding is outward-facing: triangle edges run north then
 * east, and north x east is the outward normal under this projection
 * (pinned by the winding test).
 */
export function buildCellPatch(
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
  radius: number,
  segments = 2,
): CellPatch {
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  for (let iy = 0; iy < n; iy++) {
    const lat = latMin + ((latMax - latMin) * iy) / segments;
    for (let ix = 0; ix < n; ix++) {
      const lon = lonMin + ((lonMax - lonMin) * ix) / segments;
      const v = latLonToVector3(lat, lon, radius);
      const o = (iy * n + ix) * 3;
      positions[o] = v.x;
      positions[o + 1] = v.y;
      positions[o + 2] = v.z;
    }
  }
  const indices = new Uint32Array(segments * segments * 6);
  let k = 0;
  for (let iy = 0; iy < segments; iy++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iy * n + ix;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      // (a, d, b) and (a, c, d): north-then-east edges, outward normal.
      indices[k++] = a;
      indices[k++] = d;
      indices[k++] = b;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = d;
    }
  }
  const center = latLonToVector3((latMin + latMax) / 2, (lonMin + lonMax) / 2, radius);
  return { positions, indices, center };
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Rigid rotation that moves a unit patch centred at (unitCenterLat,
 * unitCenterLon) onto a cell centred at (cellCenterLat, cellCenterLon),
 * for one instance of the shared unit-patch geometry.
 *
 * Two steps, both exact at the centre: first Ry shifts longitude (a
 * rotation about the polar axis preserves latitude and the local north
 * direction), then a rotation about the axis perpendicular to the target
 * meridian plane walks latitude along that meridian. The local north
 * direction at the patch centre is preserved, so neighbouring patches
 * stay grid-aligned with each other instead of twisting (the shortest-arc
 * rotation would twist them whenever both lat and lon change).
 *
 * No rigid rotation can keep a patch's edges exactly on lat/lon lines
 * away from the equator — a rotation maps great circles to great circles,
 * so the equator can never land on a high-latitude small circle — and a
 * rigid patch keeps its equatorial angular width, so at high latitudes
 * it spans slightly more ground in longitude than its true cell. The
 * centre is exact and the angular size is preserved, which is what the
 * heat map needs; the corners stay within a few degrees of ARC of the
 * cell (their LONGITUDE can deviate a lot near the poles, but longitude
 * is a degenerate coordinate there — a corner 25 degrees off in
 * longitude at lat 87.5 is still only ~1 degree of arc from the cell).
 *
 * Visible consequence (verified in headless screenshots, 2026-11-13):
 * where four patches meet at mid-high latitudes (lat ~50-60), their
 * splayed corners can leave a small bare-moon seam, up to ~2 degrees of
 * arc across (~0.4 of a 5-degree cell; verified by recomputing the four
 * meeting corners in node, 2026-11-13: nearest corners miss the meeting
 * point by ~1.06 degrees of arc), showing the Moon surface through the
 * heat map. Empty
 * cells show the same bare moon by design. The seam is subtle on a
 * real GPU (dark textured Moon); it reads as bright only in headless
 * SwiftShader runs where the GLB WebP texture has not decoded yet and
 * the Moon renders flat white. Closing it would need the patches
 * oversized by ~1-2 degrees per side (blurring the heat map) or a
 * per-cell geometry (abandoning the single shared unit patch), so the
 * seam is accepted as the cost of the instanced architecture.
 */
export function cellInstanceQuaternion(
  unitCenterLat: number,
  unitCenterLon: number,
  cellCenterLat: number,
  cellCenterLon: number,
): THREE.Quaternion {
  const lon0 = (unitCenterLon * Math.PI) / 180;
  const lon1 = (cellCenterLon * Math.PI) / 180;
  const lat0 = (unitCenterLat * Math.PI) / 180;
  const lat1 = (cellCenterLat * Math.PI) / 180;
  // Ry(theta) shifts longitude by -theta (x = cos lon, z = sin lon), so
  // theta = lon0 - lon1 moves lon0 -> lon1.
  const qLon = new THREE.Quaternion().setFromAxisAngle(UP, lon0 - lon1);
  // Axis perpendicular to the lon1 meridian plane (Y x d, where d is the
  // equatorial direction at lon1); rotating about it by -(lat1 - lat0)
  // walks latitude along that meridian (sign verified in the tests).
  const n = new THREE.Vector3(Math.sin(lon1), 0, -Math.cos(lon1));
  const qLat = new THREE.Quaternion().setFromAxisAngle(n, -(lat1 - lat0));
  return qLat.multiply(qLon);
}
