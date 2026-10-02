import * as THREE from 'three';

// Mission marker primitive: position from real landingSite coordinates
// (D-005 east-positive lat/lon → sphere point). Pure geometry helper + a tiny
// mesh factory so Home (ambience) and Map (interactive) share one definition.
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.cos(latR) * Math.cos(lonR),
    radius * Math.sin(latR),
    radius * Math.cos(latR) * Math.sin(lonR)
  );
}

export const MARKER_GEO = new THREE.SphereGeometry(0.05, 10, 10);
export const MARKER_MAT = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
export const MARKER_MAT_SELECTED = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
