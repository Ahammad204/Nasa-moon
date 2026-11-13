// 3D globe geometry tests — pin the orientation convention, not the data.
//
// The globe must use the app's established lat/lon -> sphere projection
// (Marker3D.latLonToVector3) and nothing else: a patch's centre must be
// exactly latLonToVector3(cell centre), its corners inside the cell, and
// the instance rotation must land the unit patch's centre on the target
// cell's centre while keeping local north pointing north.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { latLonToVector3 } from '../../three/primitives/Marker3D';
import {
  buildCellPatch,
  cellInstanceQuaternion,
  clampGlobeZoom,
  facingForLatLon,
  GLOBE_PITCH_CLAMP,
  vectorToLatLon,
  zoomToGroupScale,
} from './globeGeometry';

const EPS = 1e-9;
const DEG = 1e-6;

function close(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

function vecClose(a: THREE.Vector3, b: THREE.Vector3, eps = 1e-9): boolean {
  return close(a.x, b.x, eps) && close(a.y, b.y, eps) && close(a.z, b.z, eps);
}

/** Local north tangent (d/dlat of latLonToVector3, normalised). */
function northTangent(lat: number, lon: number): THREE.Vector3 {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.sin(latR) * Math.cos(lonR),
    Math.cos(latR),
    -Math.sin(latR) * Math.sin(lonR),
  ).normalize();
}

describe('buildCellPatch', () => {
  it('patch for lat [0,5), lon [0,5) has its centre at latLonToVector3(2.5, 2.5, r)', () => {
    const r = 2.205;
    const patch = buildCellPatch(0, 5, 0, 5, r);
    expect(vecClose(patch.center, latLonToVector3(2.5, 2.5, r))).toBe(true);
  });

  it('every vertex lies on the sphere at radius r', () => {
    const r = 2.205;
    const patch = buildCellPatch(-40, -35, 100, 105, r);
    for (let i = 0; i < patch.positions.length; i += 3) {
      const len = Math.hypot(
        patch.positions[i],
        patch.positions[i + 1],
        patch.positions[i + 2],
      );
      expect(close(len, r, 1e-6)).toBe(true);
    }
  });

  it('corners lie inside the cell bounds (lat/lon round-trip)', () => {
    const r = 2.205;
    const patch = buildCellPatch(0, 5, 0, 5, r, 1);
    // segments=1: vertices are exactly the four corners.
    expect(patch.positions.length).toBe(4 * 3);
    for (let i = 0; i < patch.positions.length; i += 3) {
      const { lat, lon } = vectorToLatLon({
        x: patch.positions[i],
        y: patch.positions[i + 1],
        z: patch.positions[i + 2],
      });
      expect(lat).toBeGreaterThanOrEqual(0 - DEG);
      expect(lat).toBeLessThanOrEqual(5 + DEG);
      expect(lon).toBeGreaterThanOrEqual(0 - DEG);
      expect(lon).toBeLessThanOrEqual(5 + DEG);
    }
  });

  it('triangle winding faces outward', () => {
    const r = 2.205;
    const patch = buildCellPatch(0, 5, 0, 5, r);
    const v = (i: number): THREE.Vector3 =>
      new THREE.Vector3(
        patch.positions[i * 3],
        patch.positions[i * 3 + 1],
        patch.positions[i * 3 + 2],
      );
    // Every triangle's geometric normal must point away from the origin
    // (dot with the patch centre direction > 0.9).
    const out = patch.center.clone().normalize();
    for (let t = 0; t < patch.indices.length; t += 3) {
      const a = v(patch.indices[t]);
      const b = v(patch.indices[t + 1]);
      const c = v(patch.indices[t + 2]);
      const n = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
        .normalize();
      expect(n.dot(out)).toBeGreaterThan(0.9);
    }
  });

  it('a polar patch is still centred exactly', () => {
    const r = 2.205;
    const patch = buildCellPatch(85, 90, -180, -175, r);
    expect(vecClose(patch.center, latLonToVector3(87.5, -177.5, r))).toBe(true);
  });
});

describe('vectorToLatLon', () => {
  it('round-trips latLonToVector3 across the sphere', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [2.5, 2.5],
      [-45, 120],
      [80, -170],
      [-80, 179.9],
      [23.4, -45.6],
    ];
    for (const [lat, lon] of cases) {
      const back = vectorToLatLon(latLonToVector3(lat, lon, 2.1));
      expect(close(back.lat, lat, DEG)).toBe(true);
      expect(close(back.lon, lon, DEG)).toBe(true);
    }
  });

  it('poles round-trip latitude (longitude is undefined at a pole)', () => {
    expect(close(vectorToLatLon(latLonToVector3(90, 0, 2.1)).lat, 90, DEG)).toBe(true);
    expect(close(vectorToLatLon(latLonToVector3(-90, 45, 2.1)).lat, -90, DEG)).toBe(true);
  });

  it('dateline keeps its sign: 180 stays 180, -180 stays -180', () => {
    expect(close(vectorToLatLon(latLonToVector3(0, 180, 2.1)).lon, 180, DEG)).toBe(true);
    expect(close(vectorToLatLon(latLonToVector3(0, -180, 2.1)).lon, -180, DEG)).toBe(true);
    expect(close(vectorToLatLon(latLonToVector3(10, 179.999, 2.1)).lon, 179.999, DEG)).toBe(
      true,
    );
  });
});

describe('facingForLatLon', () => {
  it('lon 90 faces at yaw 0 (the +Z point)', () => {
    const f = facingForLatLon(0, 90);
    expect(close(f.yaw, 0)).toBe(true);
    expect(close(f.pitch, 0)).toBe(true);
  });

  it('lon 0 faces at yaw -PI/2', () => {
    expect(close(facingForLatLon(0, 0).yaw, -Math.PI / 2)).toBe(true);
  });

  it('pitch is latitude clamped to +/-1.1 rad', () => {
    expect(close(facingForLatLon(45, 0).pitch, Math.PI / 4)).toBe(true);
    expect(close(facingForLatLon(85, 0).pitch, GLOBE_PITCH_CLAMP)).toBe(true);
    expect(close(facingForLatLon(-90, 0).pitch, -GLOBE_PITCH_CLAMP)).toBe(true);
  });
});

describe('cellInstanceQuaternion', () => {
  it('maps the unit patch centre onto the target cell centre', () => {
    const cases: Array<[number, number, number, number]> = [
      // unit centre (lat, lon), target centre (lat, lon)
      [2.5, 2.5, 2.5, 2.5], // identity
      [2.5, 2.5, 2.5, 92.5], // pure longitude shift
      [2.5, 2.5, 62.5, 2.5], // pure latitude shift
      [2.5, 2.5, 62.5, 92.5], // both
      [2.5, 2.5, -62.5, -92.5], // southern hemisphere
      [2.5, 2.5, 87.5, -177.5], // near the north pole, across the dateline
      [1.25, 1.25, -87.5, 177.5], // 2.5-degree cells, south pole
    ];
    for (const [uLat, uLon, cLat, cLon] of cases) {
      const q = cellInstanceQuaternion(uLat, uLon, cLat, cLon);
      const moved = latLonToVector3(uLat, uLon, 1).applyQuaternion(q);
      expect(vecClose(moved, latLonToVector3(cLat, cLon, 1), 1e-9)).toBe(true);
    }
  });

  it('preserves local north at the patch centre', () => {
    const cases: Array<[number, number, number, number]> = [
      [2.5, 2.5, 62.5, 92.5],
      [2.5, 2.5, -45, -120],
      [2.5, 2.5, 87.5, 177.5],
    ];
    for (const [uLat, uLon, cLat, cLon] of cases) {
      const q = cellInstanceQuaternion(uLat, uLon, cLat, cLon);
      const moved = northTangent(uLat, uLon).applyQuaternion(q);
      expect(vecClose(moved, northTangent(cLat, cLon), 1e-9)).toBe(true);
    }
  });
});

describe('globe zoom mapping', () => {
  it('clamps to [1, 7]', () => {
    expect(clampGlobeZoom(0)).toBe(1);
    expect(clampGlobeZoom(-5)).toBe(1);
    expect(clampGlobeZoom(3)).toBe(3);
    expect(clampGlobeZoom(7)).toBe(7);
    expect(clampGlobeZoom(8)).toBe(7);
    expect(clampGlobeZoom(100)).toBe(7);
    expect(clampGlobeZoom(Number.NaN)).toBe(1);
  });

  it('scale is 1 at zoom 1 and strictly increasing', () => {
    expect(zoomToGroupScale(1)).toBe(1);
    const zs = [1, 1.5, 2, 3, 5, 7];
    const scales = zs.map(zoomToGroupScale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThan(scales[i - 1]);
    }
  });

  it('max scale keeps the camera outside the globe (camera z 5.6, R 2.1)', () => {
    // Front surface at 5.6 - scale*2.1 must stay in front of the camera.
    expect(zoomToGroupScale(7) * 2.1).toBeLessThan(5.6);
  });
});
